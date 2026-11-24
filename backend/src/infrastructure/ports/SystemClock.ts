import { IClock } from '../../domain/ports/IClock';

/** The real clock. Tests use a fixed one instead. */
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
