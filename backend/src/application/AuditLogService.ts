import { AuditLog } from '../domain/entities/AuditLog';
import { User } from '../domain/entities/User';
import { IAuditLogRepository } from '../domain/repositories/IAuditLogRepository';
import { assertAdmin } from './authorization';

export interface AuditLogServiceDeps {
  auditLogs: IAuditLogRepository;
}

/** Reads the audit log. Writing is done by `AuditLogObserver`, never by hand. */
export class AuditLogService {
  constructor(private readonly deps: AuditLogServiceDeps) {}

  /** Admin only, most recent first. */
  async list(actor: User): Promise<AuditLog[]> {
    assertAdmin(actor, 'view the audit log');
    const logs = await this.deps.auditLogs.findAll();
    return [...logs].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
}
