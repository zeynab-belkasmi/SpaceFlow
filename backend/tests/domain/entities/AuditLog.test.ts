import { AuditLog } from '../../../src/domain/entities/AuditLog';
import { BookingEventType } from '../../../src/domain/observers/BookingEvent';

describe('AuditLog', () => {
  it('exposes its properties', () => {
    const log = AuditLog.create({
      id: 'log-1',
      action: BookingEventType.BOOKING_CONFIRMED,
      bookingId: 'b1',
      resourceId: 'r1',
      actorId: 'u1',
      occurredAt: new Date('2026-12-01T09:00:00Z'),
    });

    expect(log.id).toBe('log-1');
    expect(log.action).toBe(BookingEventType.BOOKING_CONFIRMED);
    expect(log.bookingId).toBe('b1');
    expect(log.resourceId).toBe('r1');
    expect(log.actorId).toBe('u1');
    expect(log.occurredAt).toEqual(new Date('2026-12-01T09:00:00Z'));
  });

  it('cannot be changed through the dates it receives or returns', () => {
    const occurredAt = new Date('2026-12-01T09:00:00Z');
    const log = AuditLog.create({
      id: 'log-1',
      action: BookingEventType.BOOKING_CONFIRMED,
      bookingId: 'b1',
      resourceId: 'r1',
      actorId: 'u1',
      occurredAt,
    });

    occurredAt.setUTCFullYear(2000);
    log.occurredAt.setUTCFullYear(2000);

    expect(log.occurredAt).toEqual(new Date('2026-12-01T09:00:00Z'));
  });
});
