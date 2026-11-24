import { Booking, Resource, User } from '../src/api/types';

export const student: User = {
  id: 'user-student',
  name: 'Alice Martin',
  email: 'alice.martin@spaceflow.local',
  role: 'STUDENT',
};
export const faculty: User = {
  id: 'user-faculty',
  name: 'Bruno Silva',
  email: 'bruno.silva@spaceflow.local',
  role: 'FACULTY',
};
export const admin: User = {
  id: 'user-admin',
  name: 'Chen Wei',
  email: 'chen.wei@spaceflow.local',
  role: 'ADMIN',
};
export const users = [student, faculty, admin];

export const roomA101: Resource = {
  id: 'room-a101',
  name: 'Room A101',
  category: 'ROOM',
  capacity: 30,
  status: 'AVAILABLE',
};
export const projector: Resource = {
  id: 'equipment-projector-1',
  name: 'Projector #1',
  category: 'EQUIPMENT',
  capacity: 1,
  status: 'AVAILABLE',
};
export const camera: Resource = {
  id: 'equipment-camera-1',
  name: 'Camera kit #1',
  category: 'EQUIPMENT',
  capacity: 1,
  status: 'MAINTENANCE',
};
export const resources = [roomA101, projector, camera];

export const page = <T>(items: T[]) => ({
  items,
  page: 1,
  pageSize: 100,
  total: items.length,
  totalPages: 1,
});

export const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  userId: student.id,
  resourceId: roomA101.id,
  start: '2099-01-10T10:00:00.000Z',
  end: '2099-01-10T11:00:00.000Z',
  status: 'CONFIRMED',
  createdAt: '2026-12-01T08:00:00.000Z',
  ...overrides,
});
