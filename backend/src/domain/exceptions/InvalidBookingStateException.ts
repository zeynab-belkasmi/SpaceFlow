import { DomainException } from './DomainException';

export class InvalidBookingStateException extends DomainException {
  readonly code = 'INVALID_BOOKING_STATE';
}
