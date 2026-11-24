import { Booking } from '../entities/Booking';

export const BookingEventType = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
} as const;
export type BookingEventType = (typeof BookingEventType)[keyof typeof BookingEventType];

/** Something that happened to a booking, sent to every observer. */
export interface BookingEvent {
  type: BookingEventType;
  booking: Booking;
  /** Who did it: the owner, or an admin cancelling someone else's booking. */
  actorId: string;
  occurredAt: Date;
}
