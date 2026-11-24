import { z } from 'zod';
import { ApiException } from './errors/ApiException';

/**
 * Checks untrusted input (body, query) against a schema and returns typed data.
 * Bad input → 400 VALIDATION_ERROR, before any service is called.
 *
 * Two levels of validation: here, the SHAPE ("capacity is a positive integer");
 * in the domain, the BUSINESS RULES ("a student books 2 hours max").
 */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ` : '') + issue.message)
      .join('; ');
    throw new ApiException(400, 'VALIDATION_ERROR', message);
  }
  return result.data;
}

type WithoutUndefined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Drops keys whose value is `undefined`. Zod types an optional field as `T | undefined`,
 * but `exactOptionalPropertyTypes` wants absent keys to be really absent.
 */
export function compact<T extends object>(input: T): WithoutUndefined<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as WithoutUndefined<T>;
}
