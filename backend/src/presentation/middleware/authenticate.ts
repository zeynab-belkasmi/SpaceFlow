import { RequestHandler, Response } from 'express';
import { UserService } from '../../application/UserService';
import { User } from '../../domain/entities/User';
import { NotFoundException } from '../../domain/exceptions/NotFoundException';
import { ApiException } from '../errors/ApiException';

export const USER_ID_HEADER = 'X-User-Id';

/**
 * Simplified authentication: the client sends the id of a seeded user in a header.
 * No password and no token, on purpose (out of scope). Because it is isolated here,
 * a real JWT check could replace it without touching routes or services.
 */
export function authenticate(users: UserService): RequestHandler {
  return async (req, res, next) => {
    const userId = req.header(USER_ID_HEADER);
    if (!userId) {
      throw new ApiException(401, 'UNAUTHENTICATED', `Missing ${USER_ID_HEADER} header.`);
    }
    try {
      res.locals.actor = await users.getById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ApiException(401, 'UNAUTHENTICATED', `Unknown user ${userId}.`);
      }
      throw error;
    }
    next();
  };
}

/** The user set by `authenticate`. Fails loudly if a route forgot the middleware. */
export function currentUser(res: Response): User {
  const actor: unknown = res.locals.actor;
  if (!(actor instanceof User)) {
    throw new Error('currentUser() called on a route without the authenticate middleware.');
  }
  return actor;
}
