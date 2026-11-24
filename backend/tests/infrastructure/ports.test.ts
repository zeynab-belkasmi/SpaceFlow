import { SystemClock } from '../../src/infrastructure/ports/SystemClock';
import { UuidGenerator } from '../../src/infrastructure/ports/UuidGenerator';

describe('SystemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('UuidGenerator', () => {
  it('generates unique UUID v4 strings', () => {
    const ids = new UuidGenerator();
    const generated = Array.from({ length: 100 }, () => ids.generate());

    expect(new Set(generated).size).toBe(100);
    for (const id of generated) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
