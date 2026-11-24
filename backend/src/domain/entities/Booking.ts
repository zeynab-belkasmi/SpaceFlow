import { InvalidBookingStateException } from '../exceptions/InvalidBookingStateException';
import { TimeSlot } from '../value-objects/TimeSlot';

export const BookingStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export interface BookingProps {
  id: string;
  // References by id, not whole objects: a booking does not own the user or the resource.
  userId: string;
  resourceId: string;
  slot: TimeSlot;
  status: BookingStatus;
  createdAt: Date;
}

/**
 * Entity: a user's reservation of a resource for a time slot.
 * `now` is always passed in (never read from the system clock) so tests stay deterministic.
 */
export class Booking {
  private constructor(private props: BookingProps) {}

  static create(props: Omit<BookingProps, 'status'> & { status?: BookingStatus }): Booking {
    return new Booking({
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
      status: props.status ?? BookingStatus.CONFIRMED,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get resourceId(): string {
    return this.props.resourceId;
  }

  // TimeSlot is immutable, so it is safe to return as is.
  get slot(): TimeSlot {
    return this.props.slot;
  }

  get status(): BookingStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  /** Active = confirmed and not yet ended. Used for role quotas. */
  isActive(now: Date): boolean {
    return this.props.status === BookingStatus.CONFIRMED && now < this.props.slot.end;
  }

  /** A booking can only be cancelled while it is confirmed and has not started yet. */
  cancel(now: Date): void {
    if (this.props.status === BookingStatus.CANCELLED) {
      throw new InvalidBookingStateException('This booking is already cancelled.');
    }
    if (now >= this.props.slot.start) {
      throw new InvalidBookingStateException('A booking cannot be cancelled once it has started.');
    }
    this.props.status = BookingStatus.CANCELLED;
  }
}
