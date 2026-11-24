import { randomUUID } from 'node:crypto';
import { IIdGenerator } from '../../domain/ports/IIdGenerator';

/** Random UUID v4 ids, built into Node: no dependency needed. */
export class UuidGenerator implements IIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
