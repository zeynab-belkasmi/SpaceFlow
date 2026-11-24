import { AuditLogObserver } from '../../../src/domain/observers/AuditLogObserver';
import { BookingEventType } from '../../../src/domain/observers/BookingEvent';
import { AuditLog } from '../../../src/domain/entities/AuditLog';
import { IAuditLogRepository } from '../../../src/domain/repositories/IAuditLogRepository';
import { Booking } from '../../../src/domain/entities/Booking';
import { TimeSlot } from '../../../src/domain/value-objects/TimeSlot';

describe('AuditLogObserver', () => {
  it('writes one audit log entry per booking event', async () => {
    const saved: AuditLog[] = [];
    // A hand-written fake repository: no database needed to test the observer.
    const repository: IAuditLogRepository = {
      save: (log) => {
        saved.push(log);
        return Promise.resolve();
      },
      findAll: () => Promise.resolve(saved),
    };
    const observer = new AuditLogObserver(repository, { generate: () => 'log-1' });
    const booking = Booking.create({
      id: 'b1',
      userId: 'u1',
      resourceId: 'r1',
      slot: TimeSlot.create(new Date('2026-12-01T10:00:00Z'), new Date('2026-12-01T12:00:00Z')),
      createdAt: new Date('2026-12-01T08:00:00Z'),
    });

    await observer.update({
      type: BookingEventType.BOOKING_CANCELLED,
      booking,
      actorId: 'admin-1',
      occurredAt: new Date('2026-12-01T09:00:00Z'),
    });

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'log-1',
      action: BookingEventType.BOOKING_CANCELLED,
      bookingId: 'b1',
      resourceId: 'r1',
      actorId: 'admin-1',
      occurredAt: new Date('2026-12-01T09:00:00Z'),
    });
  });
});
