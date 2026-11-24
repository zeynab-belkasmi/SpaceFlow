import { validateSlot } from '../../src/booking/rules';

const now = new Date('2026-12-01T08:00:00Z');
const at = (iso: string) => new Date(iso);

describe('validateSlot (client-side preview of the business rules)', () => {
  it('accepts a valid slot', () => {
    expect(
      validateSlot({
        start: at('2026-12-01T10:00:00Z'),
        end: at('2026-12-01T12:00:00Z'),
        role: 'STUDENT',
        now,
      }),
    ).toBeNull();
  });

  it.each([
    ['2026-12-01T11:00:00Z', '2026-12-01T10:00:00Z', 'The end must be after the start.'],
    ['2026-12-01T10:00:00Z', '2026-12-01T10:00:00Z', 'The end must be after the start.'],
    ['2026-12-01T07:00:00Z', '2026-12-01T09:00:00Z', 'The booking cannot start in the past.'],
    [
      '2026-12-01T10:00:00Z',
      '2026-12-01T12:01:00Z',
      'A student cannot book more than 2 hours at a time.',
    ],
    [
      '2026-12-08T08:01:00Z',
      '2026-12-08T09:00:00Z',
      'A student cannot book more than 7 days in advance.',
    ],
  ])('rejects %s → %s for a student: "%s"', (start, end, message) => {
    expect(validateSlot({ start: at(start), end: at(end), role: 'STUDENT', now })).toBe(message);
  });

  it('applies the faculty limits to faculty and admins', () => {
    const eightHours = { start: at('2026-12-01T09:00:00Z'), end: at('2026-12-01T17:00:00Z') };
    const in20Days = { start: at('2026-12-21T09:00:00Z'), end: at('2026-12-21T10:00:00Z') };

    expect(validateSlot({ ...eightHours, role: 'FACULTY', now })).toBeNull();
    expect(validateSlot({ ...in20Days, role: 'ADMIN', now })).toBeNull();
    expect(
      validateSlot({
        start: at('2026-12-01T09:00:00Z'),
        end: at('2026-12-01T17:30:00Z'),
        role: 'FACULTY',
        now,
      }),
    ).toBe('A faculty member cannot book more than 8 hours at a time.');
  });

  it('asks for both dates first', () => {
    expect(validateSlot({ start: null, end: null, role: 'STUDENT', now })).toBe(
      'Choose a date, a start time and an end time.',
    );
  });
});
