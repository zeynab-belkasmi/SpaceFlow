import { BookingService } from '../../src/application/BookingService';
import { BookingStatus } from '../../src/domain/entities/Booking';
import { ResourceStatus } from '../../src/domain/entities/Resource';
import { ForbiddenException } from '../../src/domain/exceptions/ForbiddenException';
import { InvalidBookingStateException } from '../../src/domain/exceptions/InvalidBookingStateException';
import { InvalidTimeSlotException } from '../../src/domain/exceptions/InvalidTimeSlotException';
import { NotFoundException } from '../../src/domain/exceptions/NotFoundException';
import { QuotaExceededException } from '../../src/domain/exceptions/QuotaExceededException';
import { ResourceUnderMaintenanceException } from '../../src/domain/exceptions/ResourceUnderMaintenanceException';
import { SlotConflictException } from '../../src/domain/exceptions/SlotConflictException';
import { BookingEventType } from '../../src/domain/observers/BookingEvent';
import { BookingEventPublisher } from '../../src/domain/observers/BookingEventPublisher';
import { IBookingObserver } from '../../src/domain/observers/IBookingObserver';
import { BookingPolicyFactory } from '../../src/domain/strategies/BookingPolicyFactory';
import {
  aBooking,
  admin,
  aRoom,
  at,
  faculty,
  fixedClock,
  mockBookingRepository,
  mockResourceRepository,
  NOW,
  sequentialIds,
  student,
} from './fixtures';

describe('BookingService', () => {
  let bookings: ReturnType<typeof mockBookingRepository>;
  let resources: ReturnType<typeof mockResourceRepository>;
  let observer: jest.Mocked<IBookingObserver>;
  let service: BookingService;

  beforeEach(() => {
    bookings = mockBookingRepository();
    resources = mockResourceRepository();
    resources.findById.mockResolvedValue(aRoom());

    // Real publisher with a mock observer: we check the event that reaches observers.
    const publisher = new BookingEventPublisher();
    observer = { update: jest.fn().mockResolvedValue(undefined) };
    publisher.subscribe(observer);

    service = new BookingService({
      bookings,
      resources,
      policies: new BookingPolicyFactory(),
      publisher,
      clock: fixedClock,
      ids: sequentialIds(),
    });
  });

  describe('create', () => {
    const request = { resourceId: 'room-1', start: at('10:00'), end: at('11:00') };

    it('saves a confirmed booking and returns it', async () => {
      const booking = await service.create(student, request);

      expect(booking.id).toBe('id-1');
      expect(booking.userId).toBe(student.id);
      expect(booking.resourceId).toBe('room-1');
      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.slot.start).toEqual(at('10:00'));
      expect(booking.slot.end).toEqual(at('11:00'));
      expect(booking.createdAt).toEqual(NOW);
      expect(bookings.save).toHaveBeenCalledWith(booking);
    });

    it('notifies observers with BOOKING_CONFIRMED', async () => {
      const booking = await service.create(student, request);

      expect(observer.update).toHaveBeenCalledWith({
        type: BookingEventType.BOOKING_CONFIRMED,
        booking,
        actorId: student.id,
        occurredAt: NOW,
      });
    });

    it('rejects an unknown resource with NOT_FOUND', async () => {
      resources.findById.mockResolvedValue(null);

      await expect(service.create(student, request)).rejects.toThrow(NotFoundException);
      expect(bookings.save).not.toHaveBeenCalled();
    });

    it('rejects an invalid slot (end before start)', async () => {
      await expect(
        service.create(student, { ...request, start: at('11:00'), end: at('10:00') }),
      ).rejects.toThrow(InvalidTimeSlotException);
    });

    it('rejects a slot that starts in the past', async () => {
      await expect(
        service.create(student, { ...request, start: at('07:00'), end: at('09:00') }),
      ).rejects.toThrow('A booking cannot start in the past.');
    });

    it('rejects a resource in maintenance', async () => {
      resources.findById.mockResolvedValue(aRoom(ResourceStatus.MAINTENANCE));

      await expect(service.create(student, request)).rejects.toThrow(
        ResourceUnderMaintenanceException,
      );
    });

    it('applies the quota of the user role (student: 2 hours max)', async () => {
      const threeHours = { ...request, start: at('10:00'), end: at('13:00') };

      await expect(service.create(student, threeHours)).rejects.toThrow(QuotaExceededException);
      // Same request is fine for a faculty member (8 hours max).
      await expect(service.create(faculty, threeHours)).resolves.toBeDefined();
    });

    it('counts only the active bookings of the user for the quota', async () => {
      bookings.findByUser.mockResolvedValue([
        aBooking({ id: 'past', start: at('10:00', '2026-11-30'), end: at('11:00', '2026-11-30') }),
        aBooking({ id: 'cancelled', status: BookingStatus.CANCELLED }),
        aBooking({ id: 'upcoming', start: at('14:00'), end: at('15:00') }),
      ]);

      // Only one active booking: a student can still book a second one.
      await expect(service.create(student, request)).resolves.toBeDefined();
      expect(bookings.findByUser).toHaveBeenCalledWith(student.id);
    });

    it('rejects a third active booking for a student', async () => {
      bookings.findByUser.mockResolvedValue([
        aBooking({ id: 'a', start: at('14:00'), end: at('15:00') }),
        aBooking({ id: 'b', start: at('16:00'), end: at('17:00') }),
      ]);

      await expect(service.create(student, request)).rejects.toThrow(QuotaExceededException);
    });

    it('rejects a slot overlapping a confirmed booking with SLOT_CONFLICT', async () => {
      bookings.findByResource.mockResolvedValue([
        aBooking({ userId: 'someone-else', start: at('10:30'), end: at('11:30') }),
      ]);

      await expect(service.create(student, request)).rejects.toThrow(SlotConflictException);
      expect(bookings.findByResource).toHaveBeenCalledWith('room-1');
      expect(bookings.save).not.toHaveBeenCalled();
      expect(observer.update).not.toHaveBeenCalled();
    });

    it('ignores cancelled bookings and back-to-back slots when checking conflicts', async () => {
      bookings.findByResource.mockResolvedValue([
        aBooking({ id: 'cancelled', status: BookingStatus.CANCELLED }),
        aBooking({ id: 'before', start: at('09:00'), end: at('10:00') }),
        aBooking({ id: 'after', start: at('11:00'), end: at('12:00') }),
      ]);

      await expect(service.create(student, request)).resolves.toBeDefined();
    });
  });

  describe('cancel', () => {
    const upcoming = () => aBooking({ id: 'booking-1', userId: student.id });

    it('lets the owner cancel, saves it and notifies BOOKING_CANCELLED', async () => {
      bookings.findById.mockResolvedValue(upcoming());

      const booking = await service.cancel(student, 'booking-1');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(bookings.save).toHaveBeenCalledWith(booking);
      expect(observer.update).toHaveBeenCalledWith({
        type: BookingEventType.BOOKING_CANCELLED,
        booking,
        actorId: student.id,
        occurredAt: NOW,
      });
    });

    it("lets an admin cancel someone else's booking", async () => {
      bookings.findById.mockResolvedValue(upcoming());

      const booking = await service.cancel(admin, 'booking-1');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(observer.update).toHaveBeenCalledWith(expect.objectContaining({ actorId: admin.id }));
    });

    it("forbids cancelling another user's booking", async () => {
      bookings.findById.mockResolvedValue(upcoming());

      await expect(service.cancel(faculty, 'booking-1')).rejects.toThrow(ForbiddenException);
      expect(bookings.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown booking with NOT_FOUND', async () => {
      await expect(service.cancel(student, 'nope')).rejects.toThrow(NotFoundException);
    });

    it('rejects a booking that has already started', async () => {
      bookings.findById.mockResolvedValue(aBooking({ start: at('07:30'), end: at('09:00') }));

      await expect(service.cancel(student, 'booking-1')).rejects.toThrow(
        InvalidBookingStateException,
      );
      expect(observer.update).not.toHaveBeenCalled();
    });
  });

  describe('listMine', () => {
    it("returns the user's bookings, most recent slot first", async () => {
      const early = aBooking({ id: 'early', start: at('09:00'), end: at('10:00') });
      const late = aBooking({ id: 'late', start: at('15:00'), end: at('16:00') });
      bookings.findByUser.mockResolvedValue([early, late]);

      await expect(service.listMine(student)).resolves.toEqual([late, early]);
      expect(bookings.findByUser).toHaveBeenCalledWith(student.id);
    });
  });

  describe('listAll', () => {
    it('returns every booking to an admin, most recent slot first', async () => {
      const early = aBooking({ id: 'early', start: at('09:00'), end: at('10:00') });
      const late = aBooking({ id: 'late', start: at('15:00'), end: at('16:00') });
      bookings.findAll.mockResolvedValue([early, late]);

      await expect(service.listAll(admin)).resolves.toEqual([late, early]);
    });

    it('is forbidden to non-admins', async () => {
      await expect(service.listAll(student)).rejects.toThrow(ForbiddenException);
      expect(bookings.findAll).not.toHaveBeenCalled();
    });
  });
});
