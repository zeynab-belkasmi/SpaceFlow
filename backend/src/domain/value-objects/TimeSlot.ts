import { InvalidTimeSlotException } from '../exceptions/InvalidTimeSlotException';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Value Object: a time interval [start, end).
 *
 * - Always valid: the only way to get one is `create()`, which checks the invariants.
 * - Immutable: dates are stored as timestamps and copied on the way out.
 * - Compared by value with `equals()`, not by reference.
 */
export class TimeSlot {
  // Private constructor: forces callers through `create()` and its validation.
  private constructor(
    private readonly startMs: number,
    private readonly endMs: number,
  ) {}

  static create(start: Date, end: Date): TimeSlot {
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw new InvalidTimeSlotException('Start and end must be valid dates.');
    }
    if (startMs >= endMs) {
      throw new InvalidTimeSlotException('Start must be strictly before end.');
    }
    return new TimeSlot(startMs, endMs);
  }

  // `Date` is mutable, so we hand out a fresh copy each time.
  get start(): Date {
    return new Date(this.startMs);
  }

  get end(): Date {
    return new Date(this.endMs);
  }

  durationInHours(): number {
    return (this.endMs - this.startMs) / MS_PER_HOUR;
  }

  /**
   * Half-open intervals: [9:00, 11:00) and [11:00, 13:00) do NOT overlap,
   * so a booking can start exactly when the previous one ends.
   */
  overlapsWith(other: TimeSlot): boolean {
    return this.startMs < other.endMs && other.startMs < this.endMs;
  }

  equals(other: TimeSlot): boolean {
    return this.startMs === other.startMs && this.endMs === other.endMs;
  }
}
