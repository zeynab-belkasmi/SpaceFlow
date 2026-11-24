import { QuotaBookingStrategy } from './QuotaBookingStrategy';

/** Faculty quotas: 8 hours per booking, 5 active bookings, up to 30 days ahead. */
export class FacultyBookingStrategy extends QuotaBookingStrategy {
  constructor() {
    super({
      subject: 'A faculty member',
      maxHoursPerBooking: 8,
      maxActiveBookings: 5,
      maxDaysInAdvance: 30,
    });
  }
}
