import { Role } from '../entities/User';
import { FacultyBookingStrategy } from './FacultyBookingStrategy';
import { IBookingPolicyStrategy } from './IBookingPolicyStrategy';
import { StudentBookingStrategy } from './StudentBookingStrategy';

/**
 * Picks the booking policy for a role. This is the only place that knows the mapping.
 *
 * A `Record<Role, ...>` instead of a `switch`: if a role is added to `Role`, TypeScript
 * refuses to compile until it gets a policy here.
 */
export class BookingPolicyFactory {
  private readonly policies: Record<Role, IBookingPolicyStrategy>;

  constructor() {
    // Policies hold no state, so one instance of each can be shared.
    const faculty = new FacultyBookingStrategy();
    this.policies = {
      [Role.STUDENT]: new StudentBookingStrategy(),
      [Role.FACULTY]: faculty,
      [Role.ADMIN]: faculty, // Business rule: admins follow the faculty quotas.
    };
  }

  forRole(role: Role): IBookingPolicyStrategy {
    return this.policies[role];
  }
}
