import { DomainException } from './DomainException';

/** The current user is not allowed to perform this action. */
export class ForbiddenException extends DomainException {
  readonly code = 'FORBIDDEN';
}
