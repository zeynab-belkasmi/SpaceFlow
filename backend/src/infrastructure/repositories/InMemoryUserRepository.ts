import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

/** Users are immutable, so no copies are needed. */
export class InMemoryUserRepository implements IUserRepository {
  private readonly rows: Map<string, User>;

  constructor(initial: User[] = []) {
    this.rows = new Map(initial.map((u) => [u.id, u]));
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  findAll(): Promise<User[]> {
    return Promise.resolve([...this.rows.values()]);
  }
}
