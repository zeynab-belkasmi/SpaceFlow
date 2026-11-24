/**
 * An error that only exists at the HTTP level (no header, malformed request, unknown route).
 * Business errors stay DomainExceptions; this class is never used by the domain.
 */
export class ApiException extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
