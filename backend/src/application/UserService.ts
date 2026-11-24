import { User } from '../domain/entities/User';
import { NotFoundException } from '../domain/exceptions/NotFoundException';
import { IUserRepository } from '../domain/repositories/IUserRepository';

export interface UserServiceDeps {
  users: IUserRepository;
}

/** Users are seeded. Used by the auth middleware and the frontend user picker. */
export class UserService {
  constructor(private readonly deps: UserServiceDeps) {}

  list(): Promise<User[]> {
    return this.deps.users.findAll();
  }

  async getById(id: string): Promise<User> {
    const user = await this.deps.users.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} does not exist.`);
    }
    return user;
  }
}
