import { AuditLog } from '../entities/AuditLog';
import { IIdGenerator } from '../ports/IIdGenerator';
import { IAuditLogRepository } from '../repositories/IAuditLogRepository';
import { BookingEvent } from './BookingEvent';
import { IBookingObserver } from './IBookingObserver';

/** Writes every booking event to the audit log. */
export class AuditLogObserver implements IBookingObserver {
  // Depends on interfaces only (Dependency Inversion): any storage, any id strategy.
  constructor(
    private readonly auditLogs: IAuditLogRepository,
    private readonly ids: IIdGenerator,
  ) {}

  async update(event: BookingEvent): Promise<void> {
    await this.auditLogs.save(
      AuditLog.create({
        id: this.ids.generate(),
        action: event.type,
        bookingId: event.booking.id,
        resourceId: event.booking.resourceId,
        actorId: event.actorId,
        occurredAt: event.occurredAt,
      }),
    );
  }
}
