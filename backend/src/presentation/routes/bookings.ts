import { RequestHandler, Router } from 'express';
import { z } from 'zod';
import { BookingService } from '../../application/BookingService';
import { toBookingDto } from '../dto';
import { currentUser } from '../middleware/authenticate';
import { parse } from '../validation';

// ISO 8601 with a time zone ("2026-12-01T10:00:00Z" or "+01:00"), so there is no ambiguity.
const createBody = z.object({
  resourceId: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
});

/** Every booking route requires a user. */
export function bookingsRouter(bookings: BookingService, authenticated: RequestHandler): Router {
  const router = Router();
  router.use(authenticated);

  router.post('/', async (req, res) => {
    const { resourceId, start, end } = parse(createBody, req.body);
    const booking = await bookings.create(currentUser(res), {
      resourceId,
      start: new Date(start),
      end: new Date(end),
    });
    res.status(201).location(`/api/v1/bookings/${booking.id}`).json(toBookingDto(booking));
  });

  // Declared before any "/:id" route, otherwise "me" would be read as an id.
  router.get('/me', async (_req, res) => {
    res.json((await bookings.listMine(currentUser(res))).map(toBookingDto));
  });

  router.get('/', async (_req, res) => {
    res.json((await bookings.listAll(currentUser(res))).map(toBookingDto));
  });

  router.patch('/:id/cancel', async (req, res) => {
    res.json(toBookingDto(await bookings.cancel(currentUser(res), req.params.id)));
  });

  return router;
}
