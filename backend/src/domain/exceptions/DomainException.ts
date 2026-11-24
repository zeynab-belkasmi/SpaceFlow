/**
 * Base class for every business rule violation.
 *
 * It carries a stable, machine-readable `code` (e.g. "INVALID_TIME_SLOT") but no HTTP
 * status: the domain knows nothing about the web. The presentation layer maps codes
 * to HTTP statuses.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    // Gives "InvalidTimeSlotException" instead of "Error" in stack traces and logs.
    this.name = new.target.name;
  }
}
