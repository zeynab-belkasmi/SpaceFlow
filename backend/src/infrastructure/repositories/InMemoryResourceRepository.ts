import { Resource } from '../../domain/entities/Resource';
import {
  IResourceRepository,
  ResourceFilters,
} from '../../domain/repositories/IResourceRepository';

/** Resources kept in a Map, stored and returned as copies (see InMemoryBookingRepository). */
export class InMemoryResourceRepository implements IResourceRepository {
  private readonly rows = new Map<string, Resource>();

  constructor(initial: Resource[] = []) {
    initial.forEach((r) => this.rows.set(r.id, copy(r)));
  }

  findById(id: string): Promise<Resource | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? copy(row) : null);
  }

  findAll(filters: ResourceFilters = {}): Promise<Resource[]> {
    const { category, status, minCapacity } = filters;
    const result = [...this.rows.values()]
      .filter((r) => category === undefined || r.category === category)
      .filter((r) => status === undefined || r.status === status)
      .filter((r) => minCapacity === undefined || r.capacity >= minCapacity)
      .map(copy);
    return Promise.resolve(result);
  }

  save(resource: Resource): Promise<void> {
    this.rows.set(resource.id, copy(resource));
    return Promise.resolve();
  }
}

function copy(r: Resource): Resource {
  return Resource.create({
    id: r.id,
    name: r.name,
    category: r.category,
    capacity: r.capacity,
    status: r.status,
  });
}
