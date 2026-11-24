import { greet } from '../src/greet';

describe('greet', () => {
  it('greets the given name', () => {
    expect(greet('SpaceFlow')).toBe('Hello, SpaceFlow!');
  });
});
