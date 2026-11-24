import { createContainer } from '../../src/container';
import { Role } from '../../src/domain/entities/User';
import { SlotConflictException } from '../../src/domain/exceptions/SlotConflictException';
import { ResourceUnderMaintenanceException } from '../../src/domain/exceptions/ResourceUnderMaintenanceException';
import { BookingEventType } from '../../src/domain/observers/BookingEvent';
import { SEED_IDS } from '../../src/infrastructure/seed';

/**
 * Integration test: real services + real in-memory repositories + real audit observer.
 * Only the clock is fixed, so the scenario does not depend on today's date.
 */
describe('createContainer (integration)', () => {
  const now = new Date('2026-12-01T08:00:00Z');
  const at = (time: string) => new Date(`2026-12-01T${time}:00Z`);

  const setup = async () => {
    const { services } = createContainer({ clock: { now: () => new Date(now.getTime()) } });
    const student = await services.users.getById(SEED_IDS.student);
    const faculty = await services.users.getById(SEED_IDS.faculty);
    const admin = await services.users.getById(SEED_IDS.admin);
    return { services, student, faculty, admin };
  };

  it('seeds one user per role and a few resources', async () => {
    const { services, student, faculty, admin } = await setup();

    expect([student.role, faculty.role, admin.role]).toEqual([
      Role.STUDENT,
      Role.FACULTY,
      Role.ADMIN,
    ]);
    expect((await services.resources.list({})).total).toBeGreaterThanOrEqual(4);
  });

  it('books, refuses a conflict, cancels, and writes the audit log', async () => {
    const { services, student, faculty, admin } = await setup();
    const slot = { resourceId: SEED_IDS.room, start: at('10:00'), end: at('11:00') };

    const booking = await services.bookings.create(student, slot);
    await expect(services.bookings.create(faculty, slot)).rejects.toThrow(SlotConflictException);
    await services.bookings.cancel(student, booking.id);
    // Once cancelled, the slot is free again.
    await expect(services.bookings.create(faculty, slot)).resolves.toBeDefined();

    const logs = await services.auditLogs.list(admin);
    expect(logs.map((l) => [l.action, l.actorId])).toEqual(
      expect.arrayContaining([
        [BookingEventType.BOOKING_CONFIRMED, student.id],
        [BookingEventType.BOOKING_CANCELLED, student.id],
        [BookingEventType.BOOKING_CONFIRMED, faculty.id],
      ]),
    );
    expect(logs).toHaveLength(3);
    expect(await services.bookings.listMine(student)).toHaveLength(1);
  });

  it('seeds a resource in maintenance that cannot be booked', async () => {
    const { services, student } = await setup();

    await expect(
      services.bookings.create(student, {
        resourceId: SEED_IDS.resourceInMaintenance,
        start: at('10:00'),
        end: at('11:00'),
      }),
    ).rejects.toThrow(ResourceUnderMaintenanceException);
  });

  it('gives each container its own data', async () => {
    const first = await setup();
    await first.services.bookings.create(first.student, {
      resourceId: SEED_IDS.room,
      start: at('10:00'),
      end: at('11:00'),
    });

    const second = await setup();
    expect(await second.services.bookings.listMine(second.student)).toEqual([]);
  });

  it('uses the system clock and UUIDs by default', async () => {
    const { services } = createContainer();
    const admin = await services.users.getById(SEED_IDS.admin);

    const created = await services.resources.create(admin, {
      name: 'New room',
      category: 'ROOM',
      capacity: 4,
    });

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
