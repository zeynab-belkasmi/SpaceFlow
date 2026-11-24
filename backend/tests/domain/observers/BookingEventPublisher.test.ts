import { BookingEventPublisher } from '../../../src/domain/observers/BookingEventPublisher';
import { BookingEvent, BookingEventType } from '../../../src/domain/observers/BookingEvent';
import { IBookingObserver } from '../../../src/domain/observers/IBookingObserver';
import { Booking } from '../../../src/domain/entities/Booking';
import { TimeSlot } from '../../../src/domain/value-objects/TimeSlot';

const event: BookingEvent = {
  type: BookingEventType.BOOKING_CONFIRMED,
  booking: Booking.create({
    id: 'b1',
    userId: 'u1',
    resourceId: 'r1',
    slot: TimeSlot.create(new Date('2026-12-01T10:00:00Z'), new Date('2026-12-01T12:00:00Z')),
    createdAt: new Date('2026-12-01T08:00:00Z'),
  }),
  actorId: 'u1',
  occurredAt: new Date('2026-12-01T08:00:00Z'),
};

// A fake observer that records every event it receives.
const recordingObserver = (): IBookingObserver & { received: BookingEvent[] } => {
  const received: BookingEvent[] = [];
  return {
    received,
    update: (e) => {
      received.push(e);
      return Promise.resolve();
    },
  };
};

describe('BookingEventPublisher', () => {
  it('notifies every subscribed observer with the event', async () => {
    const publisher = new BookingEventPublisher();
    const a = recordingObserver();
    const b = recordingObserver();
    publisher.subscribe(a);
    publisher.subscribe(b);

    await publisher.notify(event);

    expect(a.received).toEqual([event]);
    expect(b.received).toEqual([event]);
  });

  it('does nothing when nobody is subscribed', async () => {
    await expect(new BookingEventPublisher().notify(event)).resolves.toBeUndefined();
  });

  it('subscribes the same observer only once', async () => {
    const publisher = new BookingEventPublisher();
    const a = recordingObserver();
    publisher.subscribe(a);
    publisher.subscribe(a);

    await publisher.notify(event);

    expect(a.received).toHaveLength(1);
  });

  it('stops notifying an unsubscribed observer', async () => {
    const publisher = new BookingEventPublisher();
    const a = recordingObserver();
    publisher.subscribe(a);
    publisher.unsubscribe(a);

    await publisher.notify(event);

    expect(a.received).toEqual([]);
  });

  it('waits for async observers before resolving', async () => {
    const publisher = new BookingEventPublisher();
    let finished = false;
    publisher.subscribe({
      update: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        finished = true;
      },
    });

    await publisher.notify(event);

    expect(finished).toBe(true);
  });
});
