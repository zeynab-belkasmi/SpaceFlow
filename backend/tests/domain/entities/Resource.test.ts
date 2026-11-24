import { Resource, ResourceCategory, ResourceStatus } from '../../../src/domain/entities/Resource';
import { InvalidResourceException } from '../../../src/domain/exceptions/InvalidResourceException';

describe('Resource', () => {
  const make = (overrides: Partial<Parameters<typeof Resource.create>[0]> = {}): Resource =>
    Resource.create({
      id: 'r1',
      name: 'Study Room A',
      category: ResourceCategory.ROOM,
      capacity: 6,
      ...overrides,
    });

  describe('create', () => {
    it('is AVAILABLE by default', () => {
      const resource = make();

      expect(resource.status).toBe(ResourceStatus.AVAILABLE);
      expect(resource.id).toBe('r1');
      expect(resource.name).toBe('Study Room A');
      expect(resource.category).toBe(ResourceCategory.ROOM);
      expect(resource.capacity).toBe(6);
    });

    it('can be rebuilt with a given status (e.g. from storage)', () => {
      expect(make({ status: ResourceStatus.MAINTENANCE }).status).toBe(ResourceStatus.MAINTENANCE);
    });

    it('trims the name', () => {
      expect(make({ name: '  Room B  ' }).name).toBe('Room B');
    });

    it('rejects a blank name', () => {
      expect(() => make({ name: '   ' })).toThrow(InvalidResourceException);
    });

    it.each([0, -1, 2.5, Number.NaN])('rejects capacity %p', (capacity) => {
      expect(() => make({ capacity })).toThrow(InvalidResourceException);
    });

    it('uses the INVALID_RESOURCE code', () => {
      expect(new InvalidResourceException('x').code).toBe('INVALID_RESOURCE');
    });
  });

  describe('maintenance', () => {
    it('is bookable when AVAILABLE', () => {
      expect(make().isBookable()).toBe(true);
    });

    it('is not bookable once set to maintenance', () => {
      const resource = make();

      resource.setMaintenance();

      expect(resource.status).toBe(ResourceStatus.MAINTENANCE);
      expect(resource.isBookable()).toBe(false);
    });

    it('becomes bookable again when set back to available', () => {
      const resource = make({ status: ResourceStatus.MAINTENANCE });

      resource.setAvailable();

      expect(resource.isBookable()).toBe(true);
    });
  });
});
