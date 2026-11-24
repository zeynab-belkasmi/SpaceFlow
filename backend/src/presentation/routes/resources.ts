import { Request, RequestHandler, Router } from 'express';
import { z } from 'zod';
import { ResourceService } from '../../application/ResourceService';
import { ResourceCategory, ResourceStatus } from '../../domain/entities/Resource';
import { toAvailabilitiesDto, toPageDto, toResourceDto } from '../dto';
import { currentUser } from '../middleware/authenticate';
import { compact, parse } from '../validation';

// Query strings are always text: `z.coerce.number()` turns "20" into 20 (and "abc" into an error).
const listQuery = z.object({
  category: z.enum(ResourceCategory).optional(),
  status: z.enum(ResourceStatus).optional(),
  minCapacity: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const availabilitiesQuery = z.object({ date: z.iso.date() });

// Shape only: "name is a string". "Name must not be blank" is a domain rule (422).
const createBody = z.object({
  name: z.string(),
  category: z.enum(ResourceCategory),
  capacity: z.number().int().positive(),
});

const updateBody = createBody.partial().extend({ status: z.enum(ResourceStatus).optional() });

/** Reading the catalogue is public; changing it requires a user (and the service checks admin). */
export function resourcesRouter(resources: ResourceService, authenticated: RequestHandler): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = compact(parse(listQuery, req.query));
    res.json(toPageDto(await resources.list(query), toResourceDto));
  });

  router.get('/:id', async (req, res) => {
    res.json(toResourceDto(await resources.getById(req.params.id)));
  });

  router.get('/:id/availabilities', async (req, res) => {
    const { date } = parse(availabilitiesQuery, req.query);
    const result = await resources.getAvailabilities(req.params.id, new Date(`${date}T00:00:00Z`));
    res.json(toAvailabilitiesDto(result));
  });

  router.post('/', authenticated, async (req, res) => {
    const resource = await resources.create(currentUser(res), parse(createBody, req.body));
    res.status(201).location(`/api/v1/resources/${resource.id}`).json(toResourceDto(resource));
  });

  router.patch('/:id', authenticated, async (req: Request<{ id: string }>, res) => {
    const changes = compact(parse(updateBody, req.body));
    res.json(toResourceDto(await resources.update(currentUser(res), req.params.id, changes)));
  });

  return router;
}
