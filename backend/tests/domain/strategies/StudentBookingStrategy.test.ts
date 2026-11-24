import { StudentBookingStrategy } from '../../../src/domain/strategies/StudentBookingStrategy';
import { TimeSlot } from '../../../src/domain/value-objects/TimeSlot';
import { QuotaExceededException } from '../../../src/domain/exceptions/QuotaExceededException';
import { BookingWindowExceededException } from '../../../src/domain/exceptions/BookingWindowExceededException';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const now = new Date('2026-12-01T08:00:00Z');
// A slot starting `startInMs` after `now` and lasting `durationMs`.
const slot = (startInMs: number, durationMs: number): TimeSlot => {
  const start = new Date(now.getTime() + startInMs);
  return TimeSlot.create(start, new Date(start.getTime() + durationMs));
};

describe('StudentBookingStrategy', () => {
  const policy = new StudentBookingStrategy();

  it('accepts a booking that respects every rule', () => {
    expect(() =>
      policy.validate({ slot: slot(HOUR, HOUR), activeBookingsCount: 0, now }),
    ).not.toThrow();
  });

  describe('max duration: 2 hours', () => {
    it('accepts exactly 2 hours', () => {
      expect(() =>
        policy.validate({ slot: slot(HOUR, 2 * HOUR), activeBookingsCount: 0, now }),
      ).not.toThrow();
    });

    it('rejects more than 2 hours with QUOTA_EXCEEDED', () => {
      const act = () =>
        policy.validate({ slot: slot(HOUR, 2 * HOUR + MINUTE), activeBookingsCount: 0, now });

      expect(act).toThrow(QuotaExceededException);
      expect(act).toThrow('A student cannot book more than 2 hours at a time.');
    });
  });

  describe('max active bookings: 2', () => {
    it('accepts a second booking', () => {
      expect(() =>
        policy.validate({ slot: slot(HOUR, HOUR), activeBookingsCount: 1, now }),
      ).not.toThrow();
    });

    it('rejects a third booking with QUOTA_EXCEEDED', () => {
      const act = () => policy.validate({ slot: slot(HOUR, HOUR), activeBookingsCount: 2, now });

      expect(act).toThrow(QuotaExceededException);
      expect(act).toThrow('A student cannot have more than 2 active bookings.');
    });
  });

  describe('booking window: 7 days ahead', () => {
    it('accepts a booking starting exactly 7 days from now', () => {
      expect(() =>
        policy.validate({ slot: slot(7 * DAY, HOUR), activeBookingsCount: 0, now }),
      ).not.toThrow();
    });

    it('rejects a booking starting later than 7 days from now', () => {
      const act = () =>
        policy.validate({ slot: slot(7 * DAY + MINUTE, HOUR), activeBookingsCount: 0, now });

      expect(act).toThrow(BookingWindowExceededException);
      expect(act).toThrow('A student cannot book more than 7 days in advance.');
    });
  });
});
