import { DomainException } from './DomainException';

/** A booking starts too far in the future for the user's role. */
export class BookingWindowExceededException extends DomainException {
  readonly code = 'BOOKING_WINDOW_EXCEEDED';
}
