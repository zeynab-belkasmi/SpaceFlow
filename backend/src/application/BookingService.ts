import { Booking, BookingStatus } from '../domain/entities/Booking';
import { User } from '../domain/entities/User';
import { ForbiddenException } from '../domain/exceptions/ForbiddenException';
import { InvalidTimeSlotException } from '../domain/exceptions/InvalidTimeSlotException';
import { NotFoundException } from '../domain/exceptions/NotFoundException';
import { ResourceUnderMaintenanceException } from '../domain/exceptions/ResourceUnderMaintenanceException';
import { SlotConflictException } from '../domain/exceptions/SlotConflictException';
import { BookingEventType } from '../domain/observers/BookingEvent';
import { BookingEventPublisher } from '../domain/observers/BookingEventPublisher';
import { IClock } from '../domain/ports/IClock';
import { IIdGenerator } from '../domain/ports/IIdGenerator';
import { IBookingRepository } from '../domain/repositories/IBookingRepository';
import { IResourceRepository } from '../domain/repositories/IResourceRepository';
import { BookingPolicyFactory } from '../domain/strategies/BookingPolicyFactory';
import { TimeSlot } from '../domain/value-objects/TimeSlot';
import { assertAdmin } from './authorization';

export interface BookingServiceDeps {
  bookings: IBookingRepository;
  resources: IResourceRepository;
  policies: BookingPolicyFactory;
  publisher: BookingEventPublisher;
  clock: IClock;
  ids: IIdGenerator;
}

export interface CreateBookingInput {
  resourceId: string;
  start: Date;
  end: Date;
}

/**
 * Application service: runs the booking use cases.
 *
 * It holds no business rule of its own. It loads data through the repositories, asks the
 * domain (entities, value objects, strategies) to decide, saves, then publishes an event.
 * `actor` is the authenticated user, resolved beforehand by the presentation layer.
 */
export class BookingService {
  constructor(private readonly deps: BookingServiceDeps) {}

  async create(actor: User, input: CreateBookingInput): Promise<Booking> {
    const { bookings, resources, policies, clock, ids } = this.deps;
    const now = clock.now();

    const resource = await resources.findById(input.resourceId);
    if (!resource) {
      throw new NotFoundException(`Resource ${input.resourceId} does not exist.`);
    }

    const slot = TimeSlot.create(input.start, input.end);
    if (slot.start < now) {
      throw new InvalidTimeSlotException('A booking cannot start in the past.');
    }

    if (!resource.isBookable()) {
      throw new ResourceUnderMaintenanceException(
        `${resource.name} is under maintenance and cannot be booked.`,
      );
    }

    // Role quotas (Strategy): the service does not know which rules apply.
    const activeBookingsCount = (await bookings.findByUser(actor.id)).filter((b) =>
      b.isActive(now),
    ).length;
    policies.forRole(actor.role).validate({ slot, activeBookingsCount, now });

    // Conflicts last: it is the only check that depends on other people's bookings.
    // Note: with a real database, this check and the save must run in one transaction.
    const conflict = (await bookings.findByResource(resource.id)).some(
      (b) => b.status === BookingStatus.CONFIRMED && b.slot.overlapsWith(slot),
    );
    if (conflict) {
      throw new SlotConflictException(`${resource.name} is already booked on this slot.`);
    }

    const booking = Booking.create({
      id: ids.generate(),
      userId: actor.id,
      resourceId: resource.id,
      slot,
      createdAt: now,
    });
    await bookings.save(booking);
    await this.publish(BookingEventType.BOOKING_CONFIRMED, booking, actor, now);
    return booking;
  }

  /** The owner can cancel their booking; an admin can cancel any booking. */
  async cancel(actor: User, bookingId: string): Promise<Booking> {
    const { bookings, clock } = this.deps;
    const now = clock.now();

    const booking = await bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} does not exist.`);
    }
    if (!booking.isOwnedBy(actor.id) && !actor.isAdmin()) {
      throw new ForbiddenException('You can only cancel your own bookings.');
    }

    booking.cancel(now); // The entity refuses a double or late cancellation.
    await bookings.save(booking);
    await this.publish(BookingEventType.BOOKING_CANCELLED, booking, actor, now);
    return booking;
  }

  /** The actor's own bookings (US-08), most recent slot first. */
  async listMine(actor: User): Promise<Booking[]> {
    return sortBySlotDesc(await this.deps.bookings.findByUser(actor.id));
  }

  /** Full booking history, admin only. */
  async listAll(actor: User): Promise<Booking[]> {
    assertAdmin(actor, 'view all bookings');
    return sortBySlotDesc(await this.deps.bookings.findAll());
  }

  private publish(type: BookingEventType, booking: Booking, actor: User, now: Date) {
    return this.deps.publisher.notify({ type, booking, actorId: actor.id, occurredAt: now });
  }
}

function sortBySlotDesc(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => b.slot.start.getTime() - a.slot.start.getTime());
}
