// `as const` object + derived type: usable as `Role.ADMIN`, and a plain string at runtime.
export const Role = {
  STUDENT: 'STUDENT',
  FACULTY: 'FACULTY',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export interface UserProps {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Entity: identified by `id`. Users are seeded, so there is no update behavior yet. */
export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): Role {
    return this.props.role;
  }

  isAdmin(): boolean {
    return this.props.role === Role.ADMIN;
  }
}
