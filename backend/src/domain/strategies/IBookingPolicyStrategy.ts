import { TimeSlot } from '../value-objects/TimeSlot';

/** Everything a policy needs to decide. Plain data, so policies stay pure and easy to test. */
export interface BookingPolicyContext {
  /** The slot the user wants to book. */
  slot: TimeSlot;
  /** How many active bookings the user already has (not counting this one). */
  activeBookingsCount: number;
  /** Current time, injected so the rules are deterministic in tests. */
  now: Date;
}

/**
 * Strategy: one implementation per role.
 *
 * The caller (the booking service) only knows this interface, so adding a role means
 * adding a class, not editing an `if/else` chain (Open/Closed principle).
 */
export interface IBookingPolicyStrategy {
  /** Throws a DomainException if the booking breaks a rule; returns nothing otherwise. */
  validate(context: BookingPolicyContext): void;
}
