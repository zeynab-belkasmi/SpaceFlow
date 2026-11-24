import { api } from './client';
import {
  AuditLog,
  Availabilities,
  Booking,
  Page,
  Resource,
  ResourceCategory,
  ResourceStatus,
  User,
} from './types';

/**
 * One typed function per API call. Components import these, never Axios:
 * tests can replace this whole module with `jest.mock()`.
 */

export interface ResourceQuery {
  category?: ResourceCategory;
  status?: ResourceStatus;
  minCapacity?: number;
  page?: number;
  pageSize?: number;
}

export interface ResourceInput {
  name: string;
  category: ResourceCategory;
  capacity: number;
}

export const listUsers = async () => (await api.get<User[]>('/users')).data;

export const listResources = async (query: ResourceQuery = {}) =>
  (await api.get<Page<Resource>>('/resources', { params: query })).data;

export const createResource = async (input: ResourceInput) =>
  (await api.post<Resource>('/resources', input)).data;

export const updateResource = async (
  id: string,
  changes: Partial<ResourceInput & { status: ResourceStatus }>,
) => (await api.patch<Resource>(`/resources/${id}`, changes)).data;

/** `date` is a YYYY-MM-DD day (UTC). */
export const getAvailabilities = async (resourceId: string, date: string) =>
  (await api.get<Availabilities>(`/resources/${resourceId}/availabilities`, { params: { date } }))
    .data;

export const createBooking = async (input: { resourceId: string; start: string; end: string }) =>
  (await api.post<Booking>('/bookings', input)).data;

export const listMyBookings = async () => (await api.get<Booking[]>('/bookings/me')).data;

export const listAllBookings = async () => (await api.get<Booking[]>('/bookings')).data;

export const cancelBooking = async (id: string) =>
  (await api.patch<Booking>(`/bookings/${id}/cancel`)).data;

export const listAuditLogs = async () => (await api.get<AuditLog[]>('/audit-logs')).data;
