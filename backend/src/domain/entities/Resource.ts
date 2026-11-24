import { InvalidResourceException } from '../exceptions/InvalidResourceException';

export const ResourceCategory = {
  ROOM: 'ROOM',
  EQUIPMENT: 'EQUIPMENT',
} as const;
export type ResourceCategory = (typeof ResourceCategory)[keyof typeof ResourceCategory];

export const ResourceStatus = {
  AVAILABLE: 'AVAILABLE',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type ResourceStatus = (typeof ResourceStatus)[keyof typeof ResourceStatus];

export interface ResourceProps {
  id: string;
  name: string;
  category: ResourceCategory;
  capacity: number;
  status: ResourceStatus;
}

/**
 * Entity: a bookable room or piece of equipment.
 * Its status can change over time, but it stays the same resource (same `id`).
 */
export class Resource {
  private constructor(private props: ResourceProps) {}

  /** `status` is optional: new resources start AVAILABLE; storage can pass the saved one. */
  static create(props: Omit<ResourceProps, 'status'> & { status?: ResourceStatus }): Resource {
    const name = props.name.trim();
    if (name.length === 0) {
      throw new InvalidResourceException('Resource name must not be blank.');
    }
    if (!Number.isInteger(props.capacity) || props.capacity < 1) {
      throw new InvalidResourceException('Capacity must be a positive integer.');
    }
    return new Resource({ ...props, name, status: props.status ?? ResourceStatus.AVAILABLE });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get category(): ResourceCategory {
    return this.props.category;
  }

  get capacity(): number {
    return this.props.capacity;
  }

  get status(): ResourceStatus {
    return this.props.status;
  }

  isBookable(): boolean {
    return this.props.status === ResourceStatus.AVAILABLE;
  }

  setMaintenance(): void {
    this.props.status = ResourceStatus.MAINTENANCE;
  }

  setAvailable(): void {
    this.props.status = ResourceStatus.AVAILABLE;
  }
}
