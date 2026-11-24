import { Booking, BookingStatus } from '../../src/domain/entities/Booking';
import { Resource, ResourceStatus } from '../../src/domain/entities/Resource';
import { Role, User } from '../../src/domain/entities/User';
import { IClock } from '../../src/domain/ports/IClock';
import { IIdGenerator } from '../../src/domain/ports/IIdGenerator';
import { IAuditLogRepository } from '../../src/domain/repositories/IAuditLogRepository';
import { IBookingRepository } from '../../src/domain/repositories/IBookingRepository';
import { IResourceRepository } from '../../src/domain/repositories/IResourceRepository';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { TimeSlot } from '../../src/domain/value-objects/TimeSlot';

/** Shared test data and test doubles for the application services. */

// Fixed "now" for every test: Tuesday 1 December 2026, 08:00 UTC.
export const NOW = new Date('2026-12-01T08:00:00Z');

/** A date on 1 December 2026 (UTC), e.g. at('10:00'). */
export const at = (time: string, day = '2026-12-01'): Date => new Date(`${day}T${time}:00Z`);

export const fixedClock: IClock = { now: () => new Date(NOW.getTime()) };

/** Returns "id-1", "id-2", ... so tests can predict generated ids. */
export const sequentialIds = (): IIdGenerator => {
  let next = 1;
  return { generate: () => `id-${next++}` };
};

export const student = User.create({
  id: 'student-1',
  name: 'Sam Student',
  email: 'sam@school.test',
  role: Role.STUDENT,
});
export const faculty = User.create({
  id: 'faculty-1',
  name: 'Fay Faculty',
  email: 'fay@school.test',
  role: Role.FACULTY,
});
export const admin = User.create({
  id: 'admin-1',
  name: 'Ada Admin',
  email: 'ada@school.test',
  role: Role.ADMIN,
});

export const aRoom = (status: ResourceStatus = ResourceStatus.AVAILABLE): Resource =>
  Resource.create({ id: 'room-1', name: 'Room A', category: 'ROOM', capacity: 20, status });

export const aBooking = (
  overrides: Partial<{
    id: string;
    userId: string;
    resourceId: string;
    start: Date;
    end: Date;
    status: BookingStatus;
  }> = {},
): Booking =>
  Booking.create({
    id: overrides.id ?? 'booking-1',
    userId: overrides.userId ?? student.id,
    resourceId: overrides.resourceId ?? 'room-1',
    slot: TimeSlot.create(overrides.start ?? at('10:00'), overrides.end ?? at('11:00')),
    status: overrides.status ?? BookingStatus.CONFIRMED,
    createdAt: at('07:00'),
  });

// Jest mocks: every method is a `jest.fn()` whose result each test chooses.
export const mockBookingRepository = (): jest.Mocked<IBookingRepository> => ({
  findById: jest.fn().mockResolvedValue(null),
  findByUser: jest.fn().mockResolvedValue([]),
  findByResource: jest.fn().mockResolvedValue([]),
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
});

export const mockResourceRepository = (): jest.Mocked<IResourceRepository> => ({
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
});

export const mockUserRepository = (): jest.Mocked<IUserRepository> => ({
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
});

export const mockAuditLogRepository = (): jest.Mocked<IAuditLogRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn().mockResolvedValue([]),
});
