import { AuditLog } from '../../src/domain/entities/AuditLog';
import { Role, User } from '../../src/domain/entities/User';
import { BookingEventType } from '../../src/domain/observers/BookingEvent';
import { InMemoryAuditLogRepository } from '../../src/infrastructure/repositories/InMemoryAuditLogRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/repositories/InMemoryUserRepository';

describe('InMemoryUserRepository', () => {
  const alice = User.create({ id: 'u1', name: 'Alice', email: 'a@x.test', role: Role.STUDENT });
  const bob = User.create({ id: 'u2', name: 'Bob', email: 'b@x.test', role: Role.ADMIN });

  it('finds users by id and lists them', async () => {
    const repository = new InMemoryUserRepository([alice, bob]);

    expect((await repository.findById('u2'))?.name).toBe('Bob');
    await expect(repository.findById('nope')).resolves.toBeNull();
    expect((await repository.findAll()).map((u) => u.id)).toEqual(['u1', 'u2']);
    expect(await new InMemoryUserRepository().findAll()).toEqual([]);
  });
});

describe('InMemoryAuditLogRepository', () => {
  const log = (id: string, time: string) =>
    AuditLog.create({
      id,
      action: BookingEventType.BOOKING_CONFIRMED,
      bookingId: 'b1',
      resourceId: 'r1',
      actorId: 'u1',
      occurredAt: new Date(`2026-12-01T${time}:00Z`),
    });

  it('returns saved logs, most recent first', async () => {
    const repository = new InMemoryAuditLogRepository();
    await repository.save(log('older', '09:00'));
    await repository.save(log('newer', '10:00'));

    expect((await repository.findAll()).map((l) => l.id)).toEqual(['newer', 'older']);
  });

  it('returns a new array each time (callers cannot remove stored logs)', async () => {
    const repository = new InMemoryAuditLogRepository();
    await repository.save(log('a', '09:00'));

    (await repository.findAll()).pop();

    expect(await repository.findAll()).toHaveLength(1);
  });
});
