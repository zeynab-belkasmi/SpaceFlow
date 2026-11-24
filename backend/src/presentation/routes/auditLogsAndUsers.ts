import { RequestHandler, Router } from 'express';
import { AuditLogService } from '../../application/AuditLogService';
import { UserService } from '../../application/UserService';
import { toAuditLogDto, toUserDto } from '../dto';
import { currentUser } from '../middleware/authenticate';

/** Admin only: the service answers 403 to anyone else. */
export function auditLogsRouter(auditLogs: AuditLogService, authenticated: RequestHandler): Router {
  const router = Router();
  router.get('/', authenticated, async (_req, res) => {
    res.json((await auditLogs.list(currentUser(res))).map(toAuditLogDto));
  });
  return router;
}

/** Public: the frontend shows these users in its "log in as" picker. */
export function usersRouter(users: UserService): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json((await users.list()).map(toUserDto));
  });
  return router;
}
