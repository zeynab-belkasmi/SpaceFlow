import { DomainException } from './DomainException';

export class InvalidTimeSlotException extends DomainException {
  readonly code = 'INVALID_TIME_SLOT';
}
