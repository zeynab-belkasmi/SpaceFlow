import { Booking, BookingStatus } from '../../src/domain/entities/Booking';
import { TimeSlot } from '../../src/domain/value-objects/TimeSlot';
import { InMemoryBookingRepository } from '../../src/infrastructure/repositories/InMemoryBookingRepository';

const booking = (id: string, userId = 'u1', resourceId = 'r1'): Booking =>
  Booking.create({
    id,
    userId,
    resourceId,
    slot: TimeSlot.create(new Date('2026-12-01T10:00:00Z'), new Date('2026-12-01T11:00:00Z')),
    createdAt: new Date('2026-12-01T08:00:00Z'),
  });

const BEFORE_START = new Date('2026-12-01T09:00:00Z');

describe('InMemoryBookingRepository', () => {
  let repository: InMemoryBookingRepository;

  beforeEach(() => {
    repository = new InMemoryBookingRepository();
  });

  it('finds a saved booking by id', async () => {
    await repository.save(booking('b1'));

    const found = await repository.findById('b1');

    expect(found?.id).toBe('b1');
    expect(found?.slot.equals(booking('b1').slot)).toBe(true);
  });

  it('returns null for an unknown id', async () => {
    await expect(repository.findById('nope')).resolves.toBeNull();
  });

  it('updates a booking saved again with the same id', async () => {
    const b1 = booking('b1');
    await repository.save(b1);
    b1.cancel(BEFORE_START);
    await repository.save(b1);

    expect((await repository.findById('b1'))?.status).toBe(BookingStatus.CANCELLED);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('filters by user and by resource', async () => {
    await repository.save(booking('b1', 'u1', 'r1'));
    await repository.save(booking('b2', 'u2', 'r1'));
    await repository.save(booking('b3', 'u1', 'r2'));

    const ids = (list: Booking[]) => list.map((b) => b.id);
    expect(ids(await repository.findByUser('u1'))).toEqual(['b1', 'b3']);
    expect(ids(await repository.findByResource('r1'))).toEqual(['b1', 'b2']);
    expect(ids(await repository.findAll())).toEqual(['b1', 'b2', 'b3']);
  });

  describe('behaves like a real database: it stores copies', () => {
    it('ignores changes made to a booking after save, until it is saved again', async () => {
      const b1 = booking('b1');
      await repository.save(b1);

      b1.cancel(BEFORE_START);

      expect((await repository.findById('b1'))?.status).toBe(BookingStatus.CONFIRMED);
    });

    it('ignores changes made to a booking that was read, until it is saved', async () => {
      await repository.save(booking('b1'));

      const read = await repository.findById('b1');
      read?.cancel(BEFORE_START);
      (await repository.findAll())[0]?.cancel(BEFORE_START);

      expect((await repository.findById('b1'))?.status).toBe(BookingStatus.CONFIRMED);
    });
  });
});
