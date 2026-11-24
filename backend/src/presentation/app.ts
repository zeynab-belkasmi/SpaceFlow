import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { Container } from '../container';
import { errorHandler, notFoundHandler } from './errors/errorHandler';
import { authenticate } from './middleware/authenticate';
import { openApiDocument } from './openapi';
import { auditLogsRouter, usersRouter } from './routes/auditLogsAndUsers';
import { bookingsRouter } from './routes/bookings';
import { resourcesRouter } from './routes/resources';

/**
 * Builds the Express app without starting it: tests send requests to it directly,
 * and `main.ts` is the only file that calls `listen()`.
 *
 * Express 5 forwards errors thrown in async handlers to `errorHandler`, so routes
 * contain no try/catch.
 */
export function createApp({ services }: Container): Express {
  const app = express();
  app.disable('x-powered-by'); // Do not advertise the framework.
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api-docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const authenticated = authenticate(services.users);
  const api = express.Router();
  api.use('/resources', resourcesRouter(services.resources, authenticated));
  api.use('/bookings', bookingsRouter(services.bookings, authenticated));
  api.use('/audit-logs', auditLogsRouter(services.auditLogs, authenticated));
  api.use('/users', usersRouter(services.users));
  app.use('/api/v1', api);

  // Order matters: these two must come after every route.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
