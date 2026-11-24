/** Port: produces unique ids. Real implementation in infrastructure, a fixed one in tests. */
export interface IIdGenerator {
  generate(): string;
}
