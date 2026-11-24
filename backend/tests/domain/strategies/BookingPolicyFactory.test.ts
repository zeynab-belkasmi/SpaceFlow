import { BookingPolicyFactory } from '../../../src/domain/strategies/BookingPolicyFactory';
import { StudentBookingStrategy } from '../../../src/domain/strategies/StudentBookingStrategy';
import { FacultyBookingStrategy } from '../../../src/domain/strategies/FacultyBookingStrategy';
import { Role } from '../../../src/domain/entities/User';

describe('BookingPolicyFactory', () => {
  const factory = new BookingPolicyFactory();

  it.each([
    [Role.STUDENT, StudentBookingStrategy],
    [Role.FACULTY, FacultyBookingStrategy],
    // Business rule: ADMIN follows the FACULTY quotas.
    [Role.ADMIN, FacultyBookingStrategy],
  ])('returns the right policy for %s', (role, expected) => {
    expect(factory.forRole(role)).toBeInstanceOf(expected);
  });

  it('reuses the same instance: policies are stateless', () => {
    expect(factory.forRole(Role.STUDENT)).toBe(factory.forRole(Role.STUDENT));
  });
});
