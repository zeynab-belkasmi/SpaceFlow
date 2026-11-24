import { ErrorRequestHandler, RequestHandler } from 'express';
import { DomainException } from '../../domain/exceptions/DomainException';
import { ApiException } from './ApiException';

/**
 * Domain code → HTTP status. This table is the only place where the business layer
 * meets HTTP: the domain throws codes, the web layer decides what they mean on the wire.
 */
const STATUS_BY_DOMAIN_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  SLOT_CONFLICT: 409,
  INVALID_BOOKING_STATE: 400,
  INVALID_TIME_SLOT: 422,
  INVALID_RESOURCE: 422,
  QUOTA_EXCEEDED: 422,
  BOOKING_WINDOW_EXCEEDED: 422,
  RESOURCE_UNDER_MAINTENANCE: 422,
};
// Any other business rule violation is, by definition, an unprocessable request.
const DEFAULT_DOMAIN_STATUS = 422;

/** The uniform error body required by the specification. */
export interface ErrorBody {
  status: 'error';
  code: string;
  message: string;
  timestamp: string;
}

const body = (code: string, message: string): ErrorBody => ({
  status: 'error',
  code,
  message,
  timestamp: new Date().toISOString(),
});

/** Last route: nothing matched. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiException(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`));
};

/** Express recognises an error handler by its 4 parameters. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DomainException) {
    const status = STATUS_BY_DOMAIN_CODE[err.code] ?? DEFAULT_DOMAIN_STATUS;
    res.status(status).json(body(err.code, err.message));
    return;
  }
  if (err instanceof ApiException) {
    res.status(err.status).json(body(err.code, err.message));
    return;
  }
  // Thrown by express.json() when the body is not valid JSON.
  if (isJsonParseError(err)) {
    res.status(400).json(body('VALIDATION_ERROR', 'The request body is not valid JSON.'));
    return;
  }
  // A bug: log the details for us, send nothing sensitive to the client.
  console.error(err);
  res.status(500).json(body('INTERNAL_ERROR', 'An unexpected error occurred.'));
};

function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    (err as SyntaxError & { type?: string }).type === 'entity.parse.failed'
  );
}
