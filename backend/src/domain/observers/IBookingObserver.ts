import { BookingEvent } from './BookingEvent';

/**
 * Observer: reacts to booking events (audit log, email, ...).
 * Async because most reactions do I/O (database, mail server).
 */
export interface IBookingObserver {
  update(event: BookingEvent): Promise<void>;
}
