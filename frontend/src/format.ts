import { ApiError } from './api/client';

/** Small display helpers. Dates arrive in UTC and are shown in the browser's time zone. */

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const time = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const formatTime = (iso: string) => time.format(new Date(iso));

/** "10 Jan 2099, 10:00 – 11:00" (or with both dates if the slot spans two days). */
export function formatSlot(start: string, end: string): string {
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  return `${formatDateTime(start)} – ${sameDay ? formatTime(end) : formatDateTime(end)}`;
}

/** Joins a date input (YYYY-MM-DD) and a time input (HH:mm) into a local Date. */
export function toLocalDate(date: string, timeOfDay: string): Date | null {
  if (!date || !timeOfDay) {
    return null;
  }
  const result = new Date(`${date}T${timeOfDay}`);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** The message to show for any error, ideally the one written by the API. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Unexpected error.';
}
