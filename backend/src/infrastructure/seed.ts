import { Resource, ResourceStatus } from '../domain/entities/Resource';
import { Role, User } from '../domain/entities/User';

/** Fixed ids, so the frontend, the docs and the tests can refer to the seed data. */
export const SEED_IDS = {
  student: 'user-student',
  faculty: 'user-faculty',
  admin: 'user-admin',
  room: 'room-a101',
  resourceInMaintenance: 'equipment-camera-1',
} as const;

/** One user per role. There is no sign-up: the frontend lets you pick one of them. */
export function seedUsers(): User[] {
  return [
    User.create({
      id: SEED_IDS.student,
      name: 'Alice Martin',
      email: 'alice.martin@spaceflow.local',
      role: Role.STUDENT,
    }),
    User.create({
      id: SEED_IDS.faculty,
      name: 'Bruno Silva',
      email: 'bruno.silva@spaceflow.local',
      role: Role.FACULTY,
    }),
    User.create({
      id: SEED_IDS.admin,
      name: 'Chen Wei',
      email: 'chen.wei@spaceflow.local',
      role: Role.ADMIN,
    }),
  ];
}

/** A small catalogue, with one resource in maintenance to show that rule. */
export function seedResources(): Resource[] {
  return [
    Resource.create({ id: SEED_IDS.room, name: 'Room A101', category: 'ROOM', capacity: 30 }),
    Resource.create({ id: 'room-b204', name: 'Meeting room B204', category: 'ROOM', capacity: 8 }),
    Resource.create({ id: 'room-c3', name: 'Computer lab C3', category: 'ROOM', capacity: 24 }),
    Resource.create({
      id: 'equipment-projector-1',
      name: 'Projector #1',
      category: 'EQUIPMENT',
      capacity: 1,
    }),
    Resource.create({
      id: SEED_IDS.resourceInMaintenance,
      name: 'Camera kit #1',
      category: 'EQUIPMENT',
      capacity: 1,
      status: ResourceStatus.MAINTENANCE,
    }),
  ];
}
