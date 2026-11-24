import { Resource, ResourceCategory, ResourceStatus } from '../entities/Resource';

/** Optional filters for the catalogue; every field narrows the result. */
export interface ResourceFilters {
  category?: ResourceCategory;
  status?: ResourceStatus;
  minCapacity?: number;
}

export interface IResourceRepository {
  findById(id: string): Promise<Resource | null>;
  findAll(filters?: ResourceFilters): Promise<Resource[]>;
  /** Insert or update. */
  save(resource: Resource): Promise<void>;
}
