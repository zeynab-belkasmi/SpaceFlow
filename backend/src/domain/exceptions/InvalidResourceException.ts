import { DomainException } from './DomainException';

export class InvalidResourceException extends DomainException {
  readonly code = 'INVALID_RESOURCE';
}
