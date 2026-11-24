import { QuotaBookingStrategy } from './QuotaBookingStrategy';

/** Student quotas: 2 hours per booking, 2 active bookings, up to 7 days ahead. */
export class StudentBookingStrategy extends QuotaBookingStrategy {
  constructor() {
    super({
      subject: 'A student',
      maxHoursPerBooking: 2,
      maxActiveBookings: 2,
      maxDaysInAdvance: 7,
    });
  }
}
