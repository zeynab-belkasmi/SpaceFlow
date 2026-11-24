import { Booking } from '../entities/Booking';

/**
 * Repository: the domain says WHAT it needs, infrastructure decides HOW (memory, SQL...).
 * Methods return Promises even for the in-memory version, so a database can replace it
 * later without changing any caller.
 */
export interface IBookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByUser(userId: string): Promise<Booking[]>;
  /** Used to detect overlapping slots on a resource. */
  findByResource(resourceId: string): Promise<Booking[]>;
  findAll(): Promise<Booking[]>;
  /** Insert or update. */
  save(booking: Booking): Promise<void>;
}
