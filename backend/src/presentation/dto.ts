import { Page } from '../application/pagination';
import { Availabilities } from '../application/ResourceService';
import { AuditLog } from '../domain/entities/AuditLog';
import { Booking } from '../domain/entities/Booking';
import { Resource } from '../domain/entities/Resource';
import { User } from '../domain/entities/User';
import { TimeSlot } from '../domain/value-objects/TimeSlot';

/**
 * DTOs (Data Transfer Objects): the JSON shape the API promises to its clients.
 * Entities are never sent as is, so they can change without breaking the API,
 * and dates always travel as ISO 8601 strings in UTC.
 */

export const toUserDto = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export const toResourceDto = (r: Resource) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  capacity: r.capacity,
  status: r.status,
});

export const toSlotDto = (s: TimeSlot) => ({
  start: s.start.toISOString(),
  end: s.end.toISOString(),
});

export const toBookingDto = (b: Booking) => ({
  id: b.id,
  userId: b.userId,
  resourceId: b.resourceId,
  ...toSlotDto(b.slot),
  status: b.status,
  createdAt: b.createdAt.toISOString(),
});

export const toAuditLogDto = (l: AuditLog) => ({
  id: l.id,
  action: l.action,
  bookingId: l.bookingId,
  resourceId: l.resourceId,
  actorId: l.actorId,
  occurredAt: l.occurredAt.toISOString(),
});

export const toAvailabilitiesDto = (a: Availabilities) => ({
  resourceId: a.resource.id,
  date: a.date,
  status: a.resource.status,
  busy: a.busy.map(toSlotDto),
  free: a.free.map(toSlotDto),
});

export const toPageDto = <T, D>(page: Page<T>, toDto: (item: T) => D) => ({
  ...page,
  items: page.items.map(toDto),
});
