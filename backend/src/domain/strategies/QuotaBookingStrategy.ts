import { BookingWindowExceededException } from '../exceptions/BookingWindowExceededException';
import { QuotaExceededException } from '../exceptions/QuotaExceededException';
import { BookingPolicyContext, IBookingPolicyStrategy } from './IBookingPolicyStrategy';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface QuotaLimits {
  /** Used in error messages, e.g. "A student". */
  subject: string;
  maxHoursPerBooking: number;
  maxActiveBookings: number;
  maxDaysInAdvance: number;
}

/**
 * Shared algorithm for roles whose rules differ only by their numbers.
 * Each concrete strategy just passes its own limits; the checks are written once.
 */
export abstract class QuotaBookingStrategy implements IBookingPolicyStrategy {
  protected constructor(private readonly limits: QuotaLimits) {}

  validate({ slot, activeBookingsCount, now }: BookingPolicyContext): void {
    const { subject, maxHoursPerBooking, maxActiveBookings, maxDaysInAdvance } = this.limits;

    if (slot.durationInHours() > maxHoursPerBooking) {
      throw new QuotaExceededException(
        `${subject} cannot book more than ${maxHoursPerBooking} hours at a time.`,
      );
    }
    // `>=`: the new booking would be one more than the current count.
    if (activeBookingsCount >= maxActiveBookings) {
      throw new QuotaExceededException(
        `${subject} cannot have more than ${maxActiveBookings} active bookings.`,
      );
    }
    const latestStart = now.getTime() + maxDaysInAdvance * MS_PER_DAY;
    if (slot.start.getTime() > latestStart) {
      throw new BookingWindowExceededException(
        `${subject} cannot book more than ${maxDaysInAdvance} days in advance.`,
      );
    }
  }
}
