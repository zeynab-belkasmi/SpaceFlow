import { User, Role } from '../../../src/domain/entities/User';

describe('User', () => {
  const make = (role: Role): User =>
    User.create({ id: 'u1', name: 'Alice', email: 'alice@campus.test', role });

  it('exposes its properties', () => {
    const user = make(Role.STUDENT);

    expect(user.id).toBe('u1');
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@campus.test');
    expect(user.role).toBe(Role.STUDENT);
  });

  it.each([
    [Role.STUDENT, false],
    [Role.FACULTY, false],
    [Role.ADMIN, true],
  ])('a %s is admin: %s', (role, expected) => {
    expect(make(role).isAdmin()).toBe(expected);
  });
});
