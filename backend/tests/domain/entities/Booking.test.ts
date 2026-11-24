import { Booking, BookingStatus } from '../../../src/domain/entities/Booking';
import { TimeSlot } from '../../../src/domain/value-objects/TimeSlot';
import { InvalidBookingStateException } from '../../../src/domain/exceptions/InvalidBookingStateException';

const at = (iso: string): Date => new Date(`2026-12-01T${iso}:00Z`);

describe('Booking', () => {
  // A booking from 10:00 to 12:00.
  const make = (status?: BookingStatus): Booking =>
    Booking.create({
      id: 'b1',
      userId: 'u1',
      resourceId: 'r1',
      slot: TimeSlot.create(at('10:00'), at('12:00')),
      createdAt: at('08:00'),
      ...(status ? { status } : {}),
    });

  it('is CONFIRMED by default and exposes its properties', () => {
    const booking = make();

    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.id).toBe('b1');
    expect(booking.userId).toBe('u1');
    expect(booking.resourceId).toBe('r1');
    expect(booking.slot.equals(TimeSlot.create(at('10:00'), at('12:00')))).toBe(true);
    expect(booking.createdAt).toEqual(at('08:00'));
  });

  it('knows its owner', () => {
    expect(make().isOwnedBy('u1')).toBe(true);
    expect(make().isOwnedBy('u2')).toBe(false);
  });

  describe('isActive (confirmed and not yet ended)', () => {
    it.each([
      ['before it starts', '09:00', true],
      ['while it runs', '11:00', true],
      ['exactly when it ends', '12:00', false],
      ['after it ended', '13:00', false],
    ])('%s → %s', (_label, now, expected) => {
      expect(make().isActive(at(now))).toBe(expected);
    });

    it('is never active once cancelled', () => {
      expect(make(BookingStatus.CANCELLED).isActive(at('09:00'))).toBe(false);
    });
  });

  describe('cancel', () => {
    it('cancels a confirmed booking before it starts', () => {
      const booking = make();

      booking.cancel(at('09:00'));

      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });

    it('refuses to cancel a booking twice', () => {
      const booking = make(BookingStatus.CANCELLED);

      expect(() => booking.cancel(at('09:00'))).toThrow(InvalidBookingStateException);
    });

    it.each([
      ['exactly when it starts', '10:00'],
      ['while it runs', '11:00'],
      ['after it ended', '13:00'],
    ])('refuses to cancel %s', (_label, now) => {
      const booking = make();

      expect(() => booking.cancel(at(now))).toThrow(InvalidBookingStateException);
      expect(booking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('uses the INVALID_BOOKING_STATE code', () => {
      expect(new InvalidBookingStateException('x').code).toBe('INVALID_BOOKING_STATE');
    });
  });
});
