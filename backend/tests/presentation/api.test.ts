import request from 'supertest';
import { Express } from 'express';
import { Container, createContainer } from '../../src/container';
import { SEED_IDS } from '../../src/infrastructure/seed';
import { createApp } from '../../src/presentation/app';

/**
 * End-to-end tests of the REST API: real HTTP requests (supertest) against the real app,
 * wired with the real container. Only the clock is fixed: "now" = 2026-12-01 08:00 UTC.
 */
const NOW = new Date('2026-12-01T08:00:00Z');
const at = (time: string, day = '2026-12-01') => `${day}T${time}:00.000Z`;

const STUDENT = { 'X-User-Id': SEED_IDS.student };
const FACULTY = { 'X-User-Id': SEED_IDS.faculty };
const ADMIN = { 'X-User-Id': SEED_IDS.admin };

describe('REST API', () => {
  let container: Container;
  let app: Express;

  beforeEach(() => {
    container = createContainer({ clock: { now: () => new Date(NOW.getTime()) } });
    app = createApp(container);
  });

  const book = (headers: Record<string, string>, start = at('10:00'), end = at('11:00')) =>
    request(app)
      .post('/api/v1/bookings')
      .set(headers)
      .send({ resourceId: SEED_IDS.room, start, end });

  /** Every error follows the CDC format. */
  const expectError = (res: request.Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect(res.body).toEqual({
      status: 'error',
      code,
      message: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(new Date(res.body.timestamp as string).toISOString()).toBe(res.body.timestamp);
  };

  describe('general', () => {
    it('GET /health answers ok', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('answers 404 NOT_FOUND for an unknown route', async () => {
      expectError(await request(app).get('/api/v1/nope'), 404, 'NOT_FOUND');
    });

    it('answers 400 VALIDATION_ERROR for malformed JSON', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set(STUDENT)
        .set('Content-Type', 'application/json')
        .send('{ not json');

      expectError(res, 400, 'VALIDATION_ERROR');
    });

    it('answers 500 INTERNAL_ERROR without leaking details for an unexpected error', async () => {
      jest.spyOn(container.services.users, 'list').mockRejectedValue(new Error('db password'));
      const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const res = await request(app).get('/api/v1/users');

      expectError(res, 500, 'INTERNAL_ERROR');
      expect(res.body.message).not.toContain('db password');
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });

    it('serves the OpenAPI document and the Swagger UI', async () => {
      const json = await request(app).get('/api-docs.json');
      expect(json.status).toBe(200);
      expect(json.body.openapi).toMatch(/^3\./);
      expect(Object.keys(json.body.paths as object)).toEqual(
        expect.arrayContaining(['/bookings', '/bookings/{id}/cancel', '/audit-logs']),
      );

      const ui = await request(app).get('/api-docs/');
      expect(ui.status).toBe(200);
      expect(ui.text).toContain('swagger-ui');
    });
  });

  describe('authentication (X-User-Id header)', () => {
    it('answers 401 UNAUTHENTICATED without the header', async () => {
      expectError(await request(app).get('/api/v1/bookings/me'), 401, 'UNAUTHENTICATED');
    });

    it('answers 401 UNAUTHENTICATED for an unknown user', async () => {
      const res = await request(app).get('/api/v1/bookings/me').set('X-User-Id', 'ghost');

      expectError(res, 401, 'UNAUTHENTICATED');
    });
  });

  describe('GET /api/v1/users', () => {
    it('lists the seeded users without authentication (for the user picker)', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(200);
      expect(res.body).toContainEqual({
        id: SEED_IDS.student,
        name: 'Alice Martin',
        email: 'alice.martin@spaceflow.local',
        role: 'STUDENT',
      });
      expect(res.body).toHaveLength(3);
    });
  });

  describe('resources', () => {
    it('GET /resources lists a page of resources with filters', async () => {
      const res = await request(app).get('/api/v1/resources?category=ROOM&minCapacity=20');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
      expect(res.body.items).toContainEqual({
        id: SEED_IDS.room,
        name: 'Room A101',
        category: 'ROOM',
        capacity: 30,
        status: 'AVAILABLE',
      });
    });

    it('GET /resources supports pagination', async () => {
      const res = await request(app).get('/api/v1/resources?page=2&pageSize=2');

      expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
      expect(res.body.items).toHaveLength(2);
    });

    it.each([
      'category=CAR',
      'status=BROKEN',
      'minCapacity=0',
      'page=0',
      'pageSize=1000',
      'page=abc',
    ])('GET /resources?%s answers 400 VALIDATION_ERROR', async (query) => {
      expectError(await request(app).get(`/api/v1/resources?${query}`), 400, 'VALIDATION_ERROR');
    });

    it('GET /resources/:id returns one resource, or 404', async () => {
      const res = await request(app).get(`/api/v1/resources/${SEED_IDS.room}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Room A101');

      expectError(await request(app).get('/api/v1/resources/nope'), 404, 'NOT_FOUND');
    });

    it('GET /resources/:id/availabilities returns busy and free slots of a day', async () => {
      await book(STUDENT, at('10:00'), at('11:00'));

      const res = await request(app).get(
        `/api/v1/resources/${SEED_IDS.room}/availabilities?date=2026-12-01`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        resourceId: SEED_IDS.room,
        date: '2026-12-01',
        status: 'AVAILABLE',
        busy: [{ start: at('10:00'), end: at('11:00') }],
        free: [
          { start: at('00:00'), end: at('10:00') },
          { start: at('11:00'), end: at('00:00', '2026-12-02') },
        ],
      });
    });

    it('GET /resources/:id/availabilities validates the date and the resource', async () => {
      const url = `/api/v1/resources/${SEED_IDS.room}/availabilities`;
      expectError(await request(app).get(url), 400, 'VALIDATION_ERROR');
      expectError(await request(app).get(`${url}?date=01/12/2026`), 400, 'VALIDATION_ERROR');
      expectError(
        await request(app).get('/api/v1/resources/nope/availabilities?date=2026-12-01'),
        404,
        'NOT_FOUND',
      );
    });

    it('POST /resources lets an admin create a resource (201)', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set(ADMIN)
        .send({ name: 'Room D1', category: 'ROOM', capacity: 12 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Room D1', status: 'AVAILABLE' });
      expect(res.headers.location).toBe(`/api/v1/resources/${res.body.id as string}`);
    });

    it('POST /resources is forbidden to a student (403) and validates the body (400)', async () => {
      const body = { name: 'Room D1', category: 'ROOM', capacity: 12 };
      expectError(
        await request(app).post('/api/v1/resources').set(STUDENT).send(body),
        403,
        'FORBIDDEN',
      );
      expectError(
        await request(app)
          .post('/api/v1/resources')
          .set(ADMIN)
          .send({ ...body, capacity: -1 }),
        400,
        'VALIDATION_ERROR',
      );
      expectError(
        await request(app)
          .post('/api/v1/resources')
          .set(ADMIN)
          .send({ ...body, name: '   ' }),
        422,
        'INVALID_RESOURCE',
      );
    });

    it('PATCH /resources/:id puts a resource in maintenance, which blocks bookings (US-02)', async () => {
      const res = await request(app)
        .patch(`/api/v1/resources/${SEED_IDS.room}`)
        .set(ADMIN)
        .send({ status: 'MAINTENANCE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('MAINTENANCE');
      expectError(await book(STUDENT), 422, 'RESOURCE_UNDER_MAINTENANCE');
    });

    it('PATCH /resources/:id validates the body', async () => {
      const res = await request(app)
        .patch(`/api/v1/resources/${SEED_IDS.room}`)
        .set(ADMIN)
        .send({ status: 'BROKEN' });

      expectError(res, 400, 'VALIDATION_ERROR');
    });
  });

  describe('bookings', () => {
    it('POST /bookings creates a booking (201)', async () => {
      const res = await book(STUDENT);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        userId: SEED_IDS.student,
        resourceId: SEED_IDS.room,
        start: at('10:00'),
        end: at('11:00'),
        status: 'CONFIRMED',
        createdAt: NOW.toISOString(),
      });
      expect(res.headers.location).toBe(`/api/v1/bookings/${res.body.id as string}`);
    });

    it('answers 409 SLOT_CONFLICT for an overlapping booking (US-04)', async () => {
      await book(STUDENT);

      expectError(await book(FACULTY, at('10:30'), at('11:30')), 409, 'SLOT_CONFLICT');
    });

    it('answers 422 QUOTA_EXCEEDED for a student booking 3 hours (US-05)', async () => {
      const res = await book(STUDENT, at('10:00'), at('13:00'));

      expectError(res, 422, 'QUOTA_EXCEEDED');
      expect(res.body.message).toBe('A student cannot book more than 2 hours at a time.');
    });

    it('answers 422 QUOTA_EXCEEDED for a third active booking of a student', async () => {
      await book(STUDENT, at('10:00'), at('11:00'));
      await book(STUDENT, at('12:00'), at('13:00'));

      expectError(await book(STUDENT, at('14:00'), at('15:00')), 422, 'QUOTA_EXCEEDED');
    });

    it('answers 422 BOOKING_WINDOW_EXCEEDED too far ahead', async () => {
      const res = await book(STUDENT, at('10:00', '2026-12-20'), at('11:00', '2026-12-20'));

      expectError(res, 422, 'BOOKING_WINDOW_EXCEEDED');
    });

    it('answers 422 INVALID_TIME_SLOT when the end is before the start', async () => {
      expectError(await book(STUDENT, at('11:00'), at('10:00')), 422, 'INVALID_TIME_SLOT');
    });

    it.each([
      [{}],
      [{ resourceId: SEED_IDS.room, start: 'tomorrow', end: at('11:00') }],
      [{ resourceId: '', start: at('10:00'), end: at('11:00') }],
    ])('answers 400 VALIDATION_ERROR for body %j', async (body) => {
      const res = await request(app).post('/api/v1/bookings').set(STUDENT).send(body);

      expectError(res, 400, 'VALIDATION_ERROR');
    });

    it('answers 404 NOT_FOUND for an unknown resource', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set(STUDENT)
        .send({ resourceId: 'nope', start: at('10:00'), end: at('11:00') });

      expectError(res, 404, 'NOT_FOUND');
    });

    it('GET /bookings/me lists only my bookings (US-08)', async () => {
      await book(STUDENT, at('10:00'), at('11:00'));
      await book(FACULTY, at('12:00'), at('13:00'));

      const res = await request(app).get('/api/v1/bookings/me').set(STUDENT);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe(SEED_IDS.student);
    });

    it('GET /bookings lists every booking for an admin, 403 otherwise', async () => {
      await book(STUDENT, at('10:00'), at('11:00'));
      await book(FACULTY, at('12:00'), at('13:00'));

      const res = await request(app).get('/api/v1/bookings').set(ADMIN);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);

      expectError(await request(app).get('/api/v1/bookings').set(STUDENT), 403, 'FORBIDDEN');
    });

    describe('PATCH /bookings/:id/cancel', () => {
      it('cancels my booking (200) and writes the audit log (US-06)', async () => {
        const { body: booking } = await book(STUDENT);

        const res = await request(app)
          .patch(`/api/v1/bookings/${booking.id as string}/cancel`)
          .set(STUDENT);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CANCELLED');

        const logs = await request(app).get('/api/v1/audit-logs').set(ADMIN);
        expect(logs.status).toBe(200);
        expect(logs.body).toHaveLength(2);
        expect(logs.body.map((l: { action: string }) => l.action).sort()).toEqual([
          'BOOKING_CANCELLED',
          'BOOKING_CONFIRMED',
        ]);
        expect(logs.body[0]).toEqual({
          id: expect.any(String),
          action: expect.any(String),
          bookingId: booking.id,
          resourceId: SEED_IDS.room,
          actorId: SEED_IDS.student,
          occurredAt: NOW.toISOString(),
        });
      });

      it('answers 400 INVALID_BOOKING_STATE when already cancelled', async () => {
        const { body: booking } = await book(STUDENT);
        const url = `/api/v1/bookings/${booking.id as string}/cancel`;
        await request(app).patch(url).set(STUDENT);

        expectError(await request(app).patch(url).set(STUDENT), 400, 'INVALID_BOOKING_STATE');
      });

      it("answers 403 FORBIDDEN for someone else's booking, but lets an admin cancel it", async () => {
        const { body: booking } = await book(STUDENT);
        const url = `/api/v1/bookings/${booking.id as string}/cancel`;

        expectError(await request(app).patch(url).set(FACULTY), 403, 'FORBIDDEN');
        expect((await request(app).patch(url).set(ADMIN)).status).toBe(200);
      });

      it('answers 404 NOT_FOUND for an unknown booking', async () => {
        const res = await request(app).patch('/api/v1/bookings/nope/cancel').set(STUDENT);

        expectError(res, 404, 'NOT_FOUND');
      });
    });
  });

  describe('GET /api/v1/audit-logs', () => {
    it('is restricted to admins (403)', async () => {
      expectError(await request(app).get('/api/v1/audit-logs').set(STUDENT), 403, 'FORBIDDEN');
    });
  });
});
