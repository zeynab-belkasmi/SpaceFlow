import { DomainException } from './DomainException';

/** A requested user, resource or booking does not exist. */
export class NotFoundException extends DomainException {
  readonly code = 'NOT_FOUND';
}
