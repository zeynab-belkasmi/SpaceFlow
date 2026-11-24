import { DomainException } from './DomainException';

/** Two bookings on the same resource would overlap. */
export class SlotConflictException extends DomainException {
  readonly code = 'SLOT_CONFLICT';
}
