import { AuditLog } from '../../domain/entities/AuditLog';
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';

/** Append-only list. Audit logs are immutable, so no copies are needed. */
export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private readonly rows: AuditLog[] = [];

  save(log: AuditLog): Promise<void> {
    this.rows.push(log);
    return Promise.resolve();
  }

  /** Most recent first, in a new array so callers cannot alter the stored list. */
  findAll(): Promise<AuditLog[]> {
    return Promise.resolve(
      [...this.rows].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    );
  }
}
