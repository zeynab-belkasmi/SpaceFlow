import { FacultyBookingStrategy } from '../../../src/domain/strategies/FacultyBookingStrategy';
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

describe('FacultyBookingStrategy', () => {
  const policy = new FacultyBookingStrategy();

  describe('max duration: 8 hours', () => {
    it('accepts exactly 8 hours', () => {
      expect(() =>
        policy.validate({ slot: slot(HOUR, 8 * HOUR), activeBookingsCount: 0, now }),
      ).not.toThrow();
    });

    it('rejects more than 8 hours with QUOTA_EXCEEDED', () => {
      const act = () =>
        policy.validate({ slot: slot(HOUR, 8 * HOUR + MINUTE), activeBookingsCount: 0, now });

      expect(act).toThrow(QuotaExceededException);
      expect(act).toThrow('A faculty member cannot book more than 8 hours at a time.');
    });
  });

  describe('max active bookings: 5', () => {
    it('accepts a fifth booking', () => {
      expect(() =>
        policy.validate({ slot: slot(HOUR, HOUR), activeBookingsCount: 4, now }),
      ).not.toThrow();
    });

    it('rejects a sixth booking with QUOTA_EXCEEDED', () => {
      const act = () => policy.validate({ slot: slot(HOUR, HOUR), activeBookingsCount: 5, now });

      expect(act).toThrow(QuotaExceededException);
      expect(act).toThrow('A faculty member cannot have more than 5 active bookings.');
    });
  });

  describe('booking window: 30 days ahead', () => {
    it('accepts a booking starting exactly 30 days from now', () => {
      expect(() =>
        policy.validate({ slot: slot(30 * DAY, HOUR), activeBookingsCount: 0, now }),
      ).not.toThrow();
    });

    it('rejects a booking starting later than 30 days from now', () => {
      const act = () =>
        policy.validate({ slot: slot(30 * DAY + MINUTE, HOUR), activeBookingsCount: 0, now });

      expect(act).toThrow(BookingWindowExceededException);
      expect(act).toThrow('A faculty member cannot book more than 30 days in advance.');
    });
  });
});
