import { DomainException } from './DomainException';

/** A booking breaks a role quota (duration per booking or number of active bookings). */
export class QuotaExceededException extends DomainException {
  readonly code = 'QUOTA_EXCEEDED';
}
