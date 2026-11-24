/** JSON shapes returned by the SpaceFlow API (mirror of the backend DTOs). */

export type Role = 'STUDENT' | 'FACULTY' | 'ADMIN';
export type ResourceCategory = 'ROOM' | 'EQUIPMENT';
export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  capacity: number;
  status: ResourceStatus;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Dates are ISO 8601 strings in UTC. */
export interface Slot {
  start: string;
  end: string;
}

export interface Availabilities {
  resourceId: string;
  date: string;
  status: ResourceStatus;
  busy: Slot[];
  free: Slot[];
}

export interface Booking extends Slot {
  id: string;
  userId: string;
  resourceId: string;
  status: BookingStatus;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED';
  bookingId: string;
  resourceId: string;
  actorId: string;
  occurredAt: string;
}

/** The uniform error body of the API. */
export interface ApiErrorBody {
  status: 'error';
  code: string;
  message: string;
  timestamp: string;
}
