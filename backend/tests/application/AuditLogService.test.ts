import { AuditLogService } from '../../src/application/AuditLogService';
import { AuditLog } from '../../src/domain/entities/AuditLog';
import { ForbiddenException } from '../../src/domain/exceptions/ForbiddenException';
import { BookingEventType } from '../../src/domain/observers/BookingEvent';
import { admin, at, mockAuditLogRepository, student } from './fixtures';

const log = (id: string, occurredAt: Date): AuditLog =>
  AuditLog.create({
    id,
    action: BookingEventType.BOOKING_CONFIRMED,
    bookingId: 'b1',
    resourceId: 'room-1',
    actorId: student.id,
    occurredAt,
  });

describe('AuditLogService', () => {
  it('returns the audit log to an admin, most recent first', async () => {
    const auditLogs = mockAuditLogRepository();
    const older = log('older', at('09:00'));
    const newer = log('newer', at('10:00'));
    auditLogs.findAll.mockResolvedValue([older, newer]);

    await expect(new AuditLogService({ auditLogs }).list(admin)).resolves.toEqual([newer, older]);
  });

  it('is forbidden to non-admins', async () => {
    const auditLogs = mockAuditLogRepository();

    await expect(new AuditLogService({ auditLogs }).list(student)).rejects.toThrow(
      ForbiddenException,
    );
    expect(auditLogs.findAll).not.toHaveBeenCalled();
  });
});
