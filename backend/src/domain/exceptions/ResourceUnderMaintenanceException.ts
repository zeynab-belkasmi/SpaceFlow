import { DomainException } from './DomainException';

/** The resource is in maintenance and cannot be booked. */
export class ResourceUnderMaintenanceException extends DomainException {
  readonly code = 'RESOURCE_UNDER_MAINTENANCE';
}
