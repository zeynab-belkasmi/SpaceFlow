import { Role } from '../api/types';

/**
 * Client-side PREVIEW of the booking rules, for instant feedback in the form (US-07).
 *
 * The server stays the source of truth: it checks everything again, plus what the
 * browser cannot know (conflicts, number of active bookings). If these numbers drift
 * from the backend, the server still refuses and the UI shows its message.
 */
const LIMITS: Record<Role, { subject: string; maxHours: number; maxDaysAhead: number }> = {
  STUDENT: { subject: 'A student', maxHours: 2, maxDaysAhead: 7 },
  FACULTY: { subject: 'A faculty member', maxHours: 8, maxDaysAhead: 30 },
  ADMIN: { subject: 'A faculty member', maxHours: 8, maxDaysAhead: 30 }, // Same rules as faculty.
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export interface SlotInput {
  start: Date | null;
  end: Date | null;
  role: Role;
  now: Date;
}

/** Returns the first problem as a sentence, or null when the slot looks valid. */
export function validateSlot({ start, end, role, now }: SlotInput): string | null {
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Choose a date, a start time and an end time.';
  }
  if (end <= start) {
    return 'The end must be after the start.';
  }
  if (start < now) {
    return 'The booking cannot start in the past.';
  }
  const { subject, maxHours, maxDaysAhead } = LIMITS[role];
  if (end.getTime() - start.getTime() > maxHours * MS_PER_HOUR) {
    return `${subject} cannot book more than ${maxHours} hours at a time.`;
  }
  if (start.getTime() > now.getTime() + maxDaysAhead * MS_PER_DAY) {
    return `${subject} cannot book more than ${maxDaysAhead} days in advance.`;
  }
  return null;
}
