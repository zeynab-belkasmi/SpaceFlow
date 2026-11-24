import { User } from '../domain/entities/User';
import { ForbiddenException } from '../domain/exceptions/ForbiddenException';

/** Throws FORBIDDEN unless the actor is an admin. `action` completes the error message. */
export function assertAdmin(actor: User, action: string): void {
  if (!actor.isAdmin()) {
    throw new ForbiddenException(`Only an admin can ${action}.`);
  }
}
