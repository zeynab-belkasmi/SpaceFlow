import { BookingStatus } from '../domain/entities/Booking';
import { Resource, ResourceCategory, ResourceStatus } from '../domain/entities/Resource';
import { User } from '../domain/entities/User';
import { NotFoundException } from '../domain/exceptions/NotFoundException';
import { IIdGenerator } from '../domain/ports/IIdGenerator';
import { IBookingRepository } from '../domain/repositories/IBookingRepository';
import { IResourceRepository, ResourceFilters } from '../domain/repositories/IResourceRepository';
import { TimeSlot } from '../domain/value-objects/TimeSlot';
import { assertAdmin } from './authorization';
import { Page, PageRequest, paginate } from './pagination';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ResourceServiceDeps {
  resources: IResourceRepository;
  bookings: IBookingRepository;
  ids: IIdGenerator;
}

export interface CreateResourceInput {
  name: string;
  category: ResourceCategory;
  capacity: number;
}

export type UpdateResourceInput = Partial<CreateResourceInput & { status: ResourceStatus }>;

export interface Availabilities {
  resource: Resource;
  /** The UTC day, as YYYY-MM-DD. */
  date: string;
  /** Confirmed bookings of that day, clipped to the day, in time order. */
  busy: TimeSlot[];
  /** The gaps between busy slots. Empty when the resource is in maintenance. */
  free: TimeSlot[];
}

export class ResourceService {
  constructor(private readonly deps: ResourceServiceDeps) {}

  /** Catalogue (US-01): filters + pagination. */
  async list(query: ResourceFilters & PageRequest): Promise<Page<Resource>> {
    const { page, pageSize, ...filters } = query;
    const all = await this.deps.resources.findAll(filters);
    return paginate(all, {
      ...(page !== undefined && { page }),
      ...(pageSize !== undefined && { pageSize }),
    });
  }

  async getById(id: string): Promise<Resource> {
    const resource = await this.deps.resources.findById(id);
    if (!resource) {
      throw new NotFoundException(`Resource ${id} does not exist.`);
    }
    return resource;
  }

  async create(actor: User, input: CreateResourceInput): Promise<Resource> {
    assertAdmin(actor, 'create a resource');
    const resource = Resource.create({ id: this.deps.ids.generate(), ...input });
    await this.deps.resources.save(resource);
    return resource;
  }

  /** Edits the given fields, including the status (US-02: maintenance). */
  async update(actor: User, id: string, changes: UpdateResourceInput): Promise<Resource> {
    assertAdmin(actor, 'edit a resource');
    const current = await this.getById(id);
    // Rebuilding through `create()` re-runs the entity validation on the new values.
    const updated = Resource.create({
      id: current.id,
      name: changes.name ?? current.name,
      category: changes.category ?? current.category,
      capacity: changes.capacity ?? current.capacity,
      status: changes.status ?? current.status,
    });
    await this.deps.resources.save(updated);
    return updated;
  }

  /** Busy and free slots of a resource for the UTC day that contains `day`. */
  async getAvailabilities(resourceId: string, day: Date): Promise<Availabilities> {
    const resource = await this.getById(resourceId);
    const dayStartMs = Math.floor(day.getTime() / MS_PER_DAY) * MS_PER_DAY;
    const wholeDay = TimeSlot.create(new Date(dayStartMs), new Date(dayStartMs + MS_PER_DAY));

    const busy = (await this.deps.bookings.findByResource(resourceId))
      .filter((b) => b.status === BookingStatus.CONFIRMED && b.slot.overlapsWith(wholeDay))
      .map((b) => clip(b.slot, wholeDay))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return {
      resource,
      date: wholeDay.start.toISOString().slice(0, 10),
      busy,
      free: resource.isBookable() ? gaps(wholeDay, busy) : [],
    };
  }
}

/** The part of `slot` inside `window` (they are known to overlap). */
function clip(slot: TimeSlot, window: TimeSlot): TimeSlot {
  const start = Math.max(slot.start.getTime(), window.start.getTime());
  const end = Math.min(slot.end.getTime(), window.end.getTime());
  return TimeSlot.create(new Date(start), new Date(end));
}

/** The free intervals of `window` around the sorted `busy` slots. */
function gaps(window: TimeSlot, busy: TimeSlot[]): TimeSlot[] {
  const free: TimeSlot[] = [];
  let cursor = window.start.getTime();
  for (const slot of busy) {
    if (slot.start.getTime() > cursor) {
      free.push(TimeSlot.create(new Date(cursor), slot.start));
    }
    cursor = Math.max(cursor, slot.end.getTime());
  }
  if (cursor < window.end.getTime()) {
    free.push(TimeSlot.create(new Date(cursor), window.end));
  }
  return free;
}
