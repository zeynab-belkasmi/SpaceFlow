import { AuditLog } from '../entities/AuditLog';

export interface IAuditLogRepository {
  save(log: AuditLog): Promise<void>;
  /** Most recent first. */
  findAll(): Promise<AuditLog[]>;
}
