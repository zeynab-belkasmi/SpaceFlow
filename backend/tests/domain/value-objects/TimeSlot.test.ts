import { TimeSlot } from '../../../src/domain/value-objects/TimeSlot';
import { InvalidTimeSlotException } from '../../../src/domain/exceptions/InvalidTimeSlotException';

// Small helper: build a slot on a fixed day from "HH:MM" strings (UTC).
const slot = (start: string, end: string): TimeSlot =>
  TimeSlot.create(new Date(`2026-12-01T${start}:00Z`), new Date(`2026-12-01T${end}:00Z`));

describe('TimeSlot', () => {
  describe('create', () => {
    it('creates a slot when start is before end', () => {
      const s = slot('09:00', '11:00');

      expect(s.start).toEqual(new Date('2026-12-01T09:00:00Z'));
      expect(s.end).toEqual(new Date('2026-12-01T11:00:00Z'));
    });

    it('rejects a slot whose end is before its start', () => {
      expect(() => slot('11:00', '09:00')).toThrow(InvalidTimeSlotException);
    });

    it('rejects an empty slot (start equals end)', () => {
      expect(() => slot('09:00', '09:00')).toThrow(InvalidTimeSlotException);
    });

    it('rejects an invalid date', () => {
      expect(() => TimeSlot.create(new Date('not a date'), new Date())).toThrow(
        InvalidTimeSlotException,
      );
    });

    it('exposes a stable error code and a readable name', () => {
      const error = new InvalidTimeSlotException('Start must be strictly before end.');

      expect(error.code).toBe('INVALID_TIME_SLOT');
      expect(error.name).toBe('InvalidTimeSlotException');
    });
  });

  describe('immutability', () => {
    it('is not affected when the original Date is mutated', () => {
      const start = new Date('2026-12-01T09:00:00Z');
      const s = TimeSlot.create(start, new Date('2026-12-01T11:00:00Z'));

      start.setUTCHours(10);

      expect(s.start).toEqual(new Date('2026-12-01T09:00:00Z'));
    });

    it('is not affected when a returned Date is mutated', () => {
      const s = slot('09:00', '11:00');

      s.start.setUTCHours(10);

      expect(s.start).toEqual(new Date('2026-12-01T09:00:00Z'));
    });
  });

  describe('durationInHours', () => {
    it.each([
      ['09:00', '11:00', 2],
      ['09:00', '09:30', 0.5],
      ['08:00', '16:00', 8],
    ])('from %s to %s lasts %d hours', (start, end, hours) => {
      expect(slot(start, end).durationInHours()).toBe(hours);
    });
  });

  describe('overlapsWith', () => {
    // Slots are half-open intervals [start, end): the end instant is not included.
    it.each([
      ['partial overlap at the start', '08:00', '10:00', true],
      ['partial overlap at the end', '10:00', '12:00', true],
      ['contained inside', '09:30', '10:30', true],
      ['containing it', '08:00', '12:00', true],
      ['identical', '09:00', '11:00', true],
      ['ending exactly when it starts', '07:00', '09:00', false],
      ['starting exactly when it ends', '11:00', '13:00', false],
      ['entirely before', '06:00', '08:00', false],
      ['entirely after', '12:00', '14:00', false],
    ])('with a slot %s → %s', (_label, start, end, expected) => {
      const reference = slot('09:00', '11:00');
      const other = slot(start, end);

      expect(reference.overlapsWith(other)).toBe(expected);
      // Overlap is symmetric: A overlaps B ⇔ B overlaps A.
      expect(other.overlapsWith(reference)).toBe(expected);
    });
  });

  describe('equals', () => {
    it('is equal to another slot with the same start and end', () => {
      expect(slot('09:00', '11:00').equals(slot('09:00', '11:00'))).toBe(true);
    });

    it('is not equal when the start differs', () => {
      expect(slot('09:00', '11:00').equals(slot('09:30', '11:00'))).toBe(false);
    });

    it('is not equal when the end differs', () => {
      expect(slot('09:00', '11:00').equals(slot('09:00', '10:00'))).toBe(false);
    });
  });
});
