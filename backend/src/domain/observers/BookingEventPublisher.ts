import { BookingEvent } from './BookingEvent';
import { IBookingObserver } from './IBookingObserver';

/**
 * Subject of the Observer pattern.
 *
 * The booking service only calls `notify()`. It does not know who listens, so adding a
 * reaction (e.g. an email) means subscribing a new observer, not editing the service.
 */
export class BookingEventPublisher {
  // A Set ignores duplicates: subscribing twice does not notify twice.
  private readonly observers = new Set<IBookingObserver>();

  subscribe(observer: IBookingObserver): void {
    this.observers.add(observer);
  }

  unsubscribe(observer: IBookingObserver): void {
    this.observers.delete(observer);
  }

  /** Resolves once every observer has finished, in subscription order. */
  async notify(event: BookingEvent): Promise<void> {
    for (const observer of this.observers) {
      await observer.update(event);
    }
  }
}
