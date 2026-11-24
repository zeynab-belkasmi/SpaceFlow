import { ResourceService } from '../../src/application/ResourceService';
import { BookingStatus } from '../../src/domain/entities/Booking';
import { Resource, ResourceStatus } from '../../src/domain/entities/Resource';
import { ForbiddenException } from '../../src/domain/exceptions/ForbiddenException';
import { InvalidResourceException } from '../../src/domain/exceptions/InvalidResourceException';
import { NotFoundException } from '../../src/domain/exceptions/NotFoundException';
import {
  aBooking,
  admin,
  aRoom,
  at,
  mockBookingRepository,
  mockResourceRepository,
  sequentialIds,
  student,
} from './fixtures';

const room = (n: number): Resource =>
  Resource.create({ id: `room-${n}`, name: `Room ${n}`, category: 'ROOM', capacity: 10 });

describe('ResourceService', () => {
  let resources: ReturnType<typeof mockResourceRepository>;
  let bookings: ReturnType<typeof mockBookingRepository>;
  let service: ResourceService;

  beforeEach(() => {
    resources = mockResourceRepository();
    bookings = mockBookingRepository();
    service = new ResourceService({ resources, bookings, ids: sequentialIds() });
  });

  describe('list', () => {
    it('passes the filters to the repository', async () => {
      await service.list({ category: 'ROOM', status: 'AVAILABLE', minCapacity: 10 });

      expect(resources.findAll).toHaveBeenCalledWith({
        category: 'ROOM',
        status: 'AVAILABLE',
        minCapacity: 10,
      });
    });

    it('returns the first page of 20 items by default', async () => {
      const all = Array.from({ length: 25 }, (_, i) => room(i + 1));
      resources.findAll.mockResolvedValue(all);

      const page = await service.list({});

      expect(page.items).toEqual(all.slice(0, 20));
      expect(page).toMatchObject({ page: 1, pageSize: 20, total: 25, totalPages: 2 });
    });

    it('returns the requested page', async () => {
      const all = Array.from({ length: 25 }, (_, i) => room(i + 1));
      resources.findAll.mockResolvedValue(all);

      const page = await service.list({ page: 3, pageSize: 10 });

      expect(page.items).toEqual(all.slice(20, 25));
      expect(page).toMatchObject({ page: 3, pageSize: 10, total: 25, totalPages: 3 });
    });

    it('returns an empty page past the end', async () => {
      resources.findAll.mockResolvedValue([room(1)]);

      const page = await service.list({ page: 5 });

      expect(page.items).toEqual([]);
      expect(page.totalPages).toBe(1);
    });
  });

  describe('getById', () => {
    it('returns the resource', async () => {
      const resource = aRoom();
      resources.findById.mockResolvedValue(resource);

      await expect(service.getById('room-1')).resolves.toBe(resource);
      expect(resources.findById).toHaveBeenCalledWith('room-1');
    });

    it('throws NOT_FOUND for an unknown id', async () => {
      await expect(service.getById('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('lets an admin create an AVAILABLE resource', async () => {
      const resource = await service.create(admin, {
        name: 'Projector',
        category: 'EQUIPMENT',
        capacity: 1,
      });

      expect(resource).toMatchObject({
        id: 'id-1',
        name: 'Projector',
        category: 'EQUIPMENT',
        capacity: 1,
        status: ResourceStatus.AVAILABLE,
      });
      expect(resources.save).toHaveBeenCalledWith(resource);
    });

    it('is forbidden to non-admins', async () => {
      await expect(
        service.create(student, { name: 'X', category: 'ROOM', capacity: 1 }),
      ).rejects.toThrow(ForbiddenException);
      expect(resources.save).not.toHaveBeenCalled();
    });

    it('keeps the entity validation', async () => {
      await expect(
        service.create(admin, { name: '  ', category: 'ROOM', capacity: 1 }),
      ).rejects.toThrow(InvalidResourceException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      resources.findById.mockResolvedValue(aRoom());
    });

    it('changes only the given fields and saves', async () => {
      const updated = await service.update(admin, 'room-1', { name: 'Room B', capacity: 30 });

      expect(updated).toMatchObject({
        id: 'room-1',
        name: 'Room B',
        category: 'ROOM',
        capacity: 30,
        status: ResourceStatus.AVAILABLE,
      });
      expect(resources.save).toHaveBeenCalledWith(updated);
    });

    it('can put a resource in maintenance (US-02) and back', async () => {
      const inMaintenance = await service.update(admin, 'room-1', {
        status: ResourceStatus.MAINTENANCE,
      });
      expect(inMaintenance.status).toBe(ResourceStatus.MAINTENANCE);

      resources.findById.mockResolvedValue(inMaintenance);
      const available = await service.update(admin, 'room-1', {
        status: ResourceStatus.AVAILABLE,
      });
      expect(available.status).toBe(ResourceStatus.AVAILABLE);
    });

    it('keeps the entity validation', async () => {
      await expect(service.update(admin, 'room-1', { capacity: 0 })).rejects.toThrow(
        InvalidResourceException,
      );
      expect(resources.save).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND for an unknown id', async () => {
      resources.findById.mockResolvedValue(null);

      await expect(service.update(admin, 'nope', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('is forbidden to non-admins', async () => {
      await expect(service.update(student, 'room-1', { name: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAvailabilities', () => {
    beforeEach(() => {
      resources.findById.mockResolvedValue(aRoom());
    });

    const times = (slots: { start: Date; end: Date }[]) =>
      slots.map((s) => [s.start.toISOString(), s.end.toISOString()]);

    it('returns the whole day as free when there is no booking', async () => {
      const result = await service.getAvailabilities('room-1', at('15:00'));

      expect(result.resource.id).toBe('room-1');
      expect(result.date).toBe('2026-12-01');
      expect(result.busy).toEqual([]);
      expect(times(result.free)).toEqual([
        ['2026-12-01T00:00:00.000Z', '2026-12-02T00:00:00.000Z'],
      ]);
    });

    it('splits the day around confirmed bookings, sorted by time', async () => {
      bookings.findByResource.mockResolvedValue([
        aBooking({ id: 'b2', start: at('14:00'), end: at('16:00') }),
        aBooking({ id: 'b1', start: at('09:00'), end: at('10:00') }),
        aBooking({
          id: 'cancelled',
          start: at('11:00'),
          end: at('12:00'),
          status: BookingStatus.CANCELLED,
        }),
        aBooking({
          id: 'other-day',
          start: at('09:00', '2026-12-02'),
          end: at('10:00', '2026-12-02'),
        }),
      ]);

      const result = await service.getAvailabilities('room-1', at('15:00'));

      expect(bookings.findByResource).toHaveBeenCalledWith('room-1');
      expect(times(result.busy)).toEqual([
        ['2026-12-01T09:00:00.000Z', '2026-12-01T10:00:00.000Z'],
        ['2026-12-01T14:00:00.000Z', '2026-12-01T16:00:00.000Z'],
      ]);
      expect(times(result.free)).toEqual([
        ['2026-12-01T00:00:00.000Z', '2026-12-01T09:00:00.000Z'],
        ['2026-12-01T10:00:00.000Z', '2026-12-01T14:00:00.000Z'],
        ['2026-12-01T16:00:00.000Z', '2026-12-02T00:00:00.000Z'],
      ]);
    });

    it('clips bookings that cross midnight to the requested day', async () => {
      bookings.findByResource.mockResolvedValue([
        aBooking({ id: 'night-before', start: at('22:00', '2026-11-30'), end: at('02:00') }),
        aBooking({ id: 'night-after', start: at('23:00'), end: at('01:00', '2026-12-02') }),
      ]);

      const result = await service.getAvailabilities('room-1', at('12:00'));

      expect(times(result.busy)).toEqual([
        ['2026-12-01T00:00:00.000Z', '2026-12-01T02:00:00.000Z'],
        ['2026-12-01T23:00:00.000Z', '2026-12-02T00:00:00.000Z'],
      ]);
      expect(times(result.free)).toEqual([
        ['2026-12-01T02:00:00.000Z', '2026-12-01T23:00:00.000Z'],
      ]);
    });

    it('has no free slot when the resource is in maintenance', async () => {
      resources.findById.mockResolvedValue(aRoom(ResourceStatus.MAINTENANCE));

      const result = await service.getAvailabilities('room-1', at('12:00'));

      expect(result.free).toEqual([]);
    });

    it('throws NOT_FOUND for an unknown resource', async () => {
      resources.findById.mockResolvedValue(null);

      await expect(service.getAvailabilities('nope', at('12:00'))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
