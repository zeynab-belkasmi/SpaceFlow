/** Port: the current time. Injected so that time-based rules are testable. */
export interface IClock {
  now(): Date;
}
