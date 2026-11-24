import { Resource, ResourceStatus } from '../../src/domain/entities/Resource';
import { InMemoryResourceRepository } from '../../src/infrastructure/repositories/InMemoryResourceRepository';

const room101 = () =>
  Resource.create({ id: 'r1', name: 'Room 101', category: 'ROOM', capacity: 30 });
const room102 = () =>
  Resource.create({
    id: 'r2',
    name: 'Room 102',
    category: 'ROOM',
    capacity: 8,
    status: ResourceStatus.MAINTENANCE,
  });
const projector = () =>
  Resource.create({ id: 'r3', name: 'Projector', category: 'EQUIPMENT', capacity: 1 });

describe('InMemoryResourceRepository', () => {
  let repository: InMemoryResourceRepository;

  beforeEach(() => {
    repository = new InMemoryResourceRepository([room101(), room102(), projector()]);
  });

  const ids = (list: Resource[]) => list.map((r) => r.id);

  it('starts with the given resources', async () => {
    expect(ids(await repository.findAll())).toEqual(['r1', 'r2', 'r3']);
    expect(await new InMemoryResourceRepository().findAll()).toEqual([]);
  });

  it('finds a resource by id, or returns null', async () => {
    expect((await repository.findById('r3'))?.name).toBe('Projector');
    await expect(repository.findById('nope')).resolves.toBeNull();
  });

  it.each([
    [{ category: 'ROOM' as const }, ['r1', 'r2']],
    [{ status: ResourceStatus.AVAILABLE }, ['r1', 'r3']],
    [{ minCapacity: 8 }, ['r1', 'r2']],
    [{ category: 'ROOM' as const, status: ResourceStatus.AVAILABLE, minCapacity: 10 }, ['r1']],
    [{}, ['r1', 'r2', 'r3']],
  ])('filters with %j', async (filters, expected) => {
    expect(ids(await repository.findAll(filters))).toEqual(expected);
  });

  it('inserts and updates with save', async () => {
    const updated = room101();
    updated.setMaintenance();
    await repository.save(updated);
    await repository.save(
      Resource.create({ id: 'r4', name: 'Camera', category: 'EQUIPMENT', capacity: 1 }),
    );

    expect((await repository.findById('r1'))?.status).toBe(ResourceStatus.MAINTENANCE);
    expect(ids(await repository.findAll())).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('stores copies: changes are ignored until save', async () => {
    const read = await repository.findById('r1');
    read?.setMaintenance();

    expect((await repository.findById('r1'))?.status).toBe(ResourceStatus.AVAILABLE);
  });
});
