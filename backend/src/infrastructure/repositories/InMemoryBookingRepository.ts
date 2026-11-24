import { Booking } from '../../domain/entities/Booking';
import { IBookingRepository } from '../../domain/repositories/IBookingRepository';

/**
 * Bookings kept in a Map, lost when the server stops.
 *
 * It stores and returns COPIES, like a real database: changing a booking has no effect
 * until `save()` is called. Without this, tests could pass here and fail with Prisma.
 * Methods are `async` to honour the Promise-based interface.
 */
export class InMemoryBookingRepository implements IBookingRepository {
  private readonly rows = new Map<string, Booking>();

  findById(id: string): Promise<Booking | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? copy(row) : null);
  }

  findByUser(userId: string): Promise<Booking[]> {
    return this.where((b) => b.userId === userId);
  }

  findByResource(resourceId: string): Promise<Booking[]> {
    return this.where((b) => b.resourceId === resourceId);
  }

  findAll(): Promise<Booking[]> {
    return this.where(() => true);
  }

  save(booking: Booking): Promise<void> {
    this.rows.set(booking.id, copy(booking));
    return Promise.resolve();
  }

  private where(predicate: (b: Booking) => boolean): Promise<Booking[]> {
    return Promise.resolve([...this.rows.values()].filter(predicate).map(copy));
  }
}

// TimeSlot is immutable, so it can be shared; everything else is rebuilt.
function copy(b: Booking): Booking {
  return Booking.create({
    id: b.id,
    userId: b.userId,
    resourceId: b.resourceId,
    slot: b.slot,
    status: b.status,
    createdAt: b.createdAt,
  });
}
