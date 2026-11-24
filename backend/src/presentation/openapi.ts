import { SEED_IDS } from '../infrastructure/seed';

/**
 * OpenAPI 3.0 description of the API, served as JSON at /api-docs.json and as an
 * interactive page (Swagger UI) at /api-docs. Keep it in sync with the routes:
 * the end-to-end tests check that the main paths are documented.
 */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const error = (description: string) => ({ description, content: json(ref('Error')) });
const idParam = (description: string) => ({
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});
const authenticated = [{ userId: [] }];

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SpaceFlow API',
    version: '1.0.0',
    description:
      'Booking of rooms and equipment. Authentication is simplified: send the id of a ' +
      `seeded user in the \`X-User-Id\` header (\`${SEED_IDS.student}\`, ` +
      `\`${SEED_IDS.faculty}\` or \`${SEED_IDS.admin}\`). Click "Authorize" to set it.`,
  },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Resources' }, { name: 'Bookings' }, { name: 'Audit' }, { name: 'Users' }],
  components: {
    securitySchemes: {
      userId: { type: 'apiKey', in: 'header', name: 'X-User-Id' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'code', 'message', 'timestamp'],
        properties: {
          status: { type: 'string', enum: ['error'] },
          code: { type: 'string', example: 'QUOTA_EXCEEDED' },
          message: {
            type: 'string',
            example: 'A student cannot book more than 2 hours at a time.',
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: SEED_IDS.student },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['STUDENT', 'FACULTY', 'ADMIN'] },
        },
      },
      Resource: {
        type: 'object',
        properties: {
          id: { type: 'string', example: SEED_IDS.room },
          name: { type: 'string', example: 'Room A101' },
          category: { type: 'string', enum: ['ROOM', 'EQUIPMENT'] },
          capacity: { type: 'integer', minimum: 1, example: 30 },
          status: { type: 'string', enum: ['AVAILABLE', 'MAINTENANCE'] },
        },
      },
      ResourceInput: {
        type: 'object',
        required: ['name', 'category', 'capacity'],
        properties: {
          name: { type: 'string', example: 'Room D1' },
          category: { type: 'string', enum: ['ROOM', 'EQUIPMENT'] },
          capacity: { type: 'integer', minimum: 1, example: 12 },
        },
      },
      ResourcePatch: {
        type: 'object',
        description: 'Only the given fields change.',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: ['ROOM', 'EQUIPMENT'] },
          capacity: { type: 'integer', minimum: 1 },
          status: { type: 'string', enum: ['AVAILABLE', 'MAINTENANCE'] },
        },
      },
      ResourcePage: {
        type: 'object',
        properties: {
          items: { type: 'array', items: ref('Resource') },
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 5 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      Slot: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
        },
      },
      Availabilities: {
        type: 'object',
        properties: {
          resourceId: { type: 'string' },
          date: { type: 'string', format: 'date', example: '2026-12-01' },
          status: { type: 'string', enum: ['AVAILABLE', 'MAINTENANCE'] },
          busy: { type: 'array', items: ref('Slot') },
          free: {
            type: 'array',
            items: ref('Slot'),
            description: 'Empty when the resource is in maintenance.',
          },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          resourceId: { type: 'string' },
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      BookingInput: {
        type: 'object',
        required: ['resourceId', 'start', 'end'],
        properties: {
          resourceId: { type: 'string', example: SEED_IDS.room },
          start: { type: 'string', format: 'date-time', example: '2026-12-01T10:00:00Z' },
          end: { type: 'string', format: 'date-time', example: '2026-12-01T11:00:00Z' },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          action: { type: 'string', enum: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED'] },
          bookingId: { type: 'string' },
          resourceId: { type: 'string' },
          actorId: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/resources': {
      get: {
        tags: ['Resources'],
        summary: 'List resources (filters and pagination)',
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string', enum: ['ROOM', 'EQUIPMENT'] },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['AVAILABLE', 'MAINTENANCE'] },
          },
          { name: 'minCapacity', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: { description: 'A page of resources', content: json(ref('ResourcePage')) },
          400: error('Invalid query parameter'),
        },
      },
      post: {
        tags: ['Resources'],
        summary: 'Create a resource (admin)',
        security: authenticated,
        requestBody: { required: true, content: json(ref('ResourceInput')) },
        responses: {
          201: { description: 'Created', content: json(ref('Resource')) },
          400: error('Invalid body'),
          401: error('Missing or unknown X-User-Id'),
          403: error('Not an admin'),
          422: error('Business rule violated (e.g. blank name)'),
        },
      },
    },
    '/resources/{id}': {
      get: {
        tags: ['Resources'],
        summary: 'Get one resource',
        parameters: [idParam('Resource id')],
        responses: {
          200: { description: 'The resource', content: json(ref('Resource')) },
          404: error('Unknown resource'),
        },
      },
      patch: {
        tags: ['Resources'],
        summary: 'Edit a resource or set it in maintenance (admin)',
        security: authenticated,
        parameters: [idParam('Resource id')],
        requestBody: { required: true, content: json(ref('ResourcePatch')) },
        responses: {
          200: { description: 'The updated resource', content: json(ref('Resource')) },
          400: error('Invalid body'),
          401: error('Missing or unknown X-User-Id'),
          403: error('Not an admin'),
          404: error('Unknown resource'),
          422: error('Business rule violated'),
        },
      },
    },
    '/resources/{id}/availabilities': {
      get: {
        tags: ['Resources'],
        summary: 'Busy and free slots of a resource for one day (UTC)',
        parameters: [
          idParam('Resource id'),
          {
            name: 'date',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date', example: '2026-12-01' },
          },
        ],
        responses: {
          200: { description: 'Availabilities', content: json(ref('Availabilities')) },
          400: error('Missing or invalid date'),
          404: error('Unknown resource'),
        },
      },
    },
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'Full booking history (admin)',
        security: authenticated,
        responses: {
          200: {
            description: 'All bookings',
            content: json({ type: 'array', items: ref('Booking') }),
          },
          401: error('Missing or unknown X-User-Id'),
          403: error('Not an admin'),
        },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Book a resource (runs every business rule)',
        security: authenticated,
        requestBody: { required: true, content: json(ref('BookingInput')) },
        responses: {
          201: { description: 'Booking confirmed', content: json(ref('Booking')) },
          400: error('Invalid body'),
          401: error('Missing or unknown X-User-Id'),
          404: error('Unknown resource'),
          409: error('SLOT_CONFLICT: the slot overlaps another booking'),
          422: error(
            'QUOTA_EXCEEDED, BOOKING_WINDOW_EXCEEDED, RESOURCE_UNDER_MAINTENANCE or INVALID_TIME_SLOT',
          ),
        },
      },
    },
    '/bookings/me': {
      get: {
        tags: ['Bookings'],
        summary: 'My bookings, most recent first',
        security: authenticated,
        responses: {
          200: {
            description: 'My bookings',
            content: json({ type: 'array', items: ref('Booking') }),
          },
          401: error('Missing or unknown X-User-Id'),
        },
      },
    },
    '/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel a booking (owner or admin, before it starts)',
        security: authenticated,
        parameters: [idParam('Booking id')],
        responses: {
          200: { description: 'Booking cancelled', content: json(ref('Booking')) },
          400: error('INVALID_BOOKING_STATE: already cancelled or already started'),
          401: error('Missing or unknown X-User-Id'),
          403: error('Not your booking'),
          404: error('Unknown booking'),
        },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: 'Audit log, most recent first (admin)',
        security: authenticated,
        responses: {
          200: {
            description: 'Audit log',
            content: json({ type: 'array', items: ref('AuditLog') }),
          },
          401: error('Missing or unknown X-User-Id'),
          403: error('Not an admin'),
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Seeded users (public, for the user picker)',
        responses: {
          200: { description: 'Users', content: json({ type: 'array', items: ref('User') }) },
        },
      },
    },
  },
};
