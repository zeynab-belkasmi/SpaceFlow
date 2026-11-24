import { UserService } from '../../src/application/UserService';
import { NotFoundException } from '../../src/domain/exceptions/NotFoundException';
import { admin, mockUserRepository, student } from './fixtures';

describe('UserService', () => {
  let users: ReturnType<typeof mockUserRepository>;
  let service: UserService;

  beforeEach(() => {
    users = mockUserRepository();
    service = new UserService({ users });
  });

  it('lists every user', async () => {
    users.findAll.mockResolvedValue([student, admin]);

    await expect(service.list()).resolves.toEqual([student, admin]);
  });

  it('finds a user by id', async () => {
    users.findById.mockResolvedValue(student);

    await expect(service.getById(student.id)).resolves.toBe(student);
    expect(users.findById).toHaveBeenCalledWith(student.id);
  });

  it('throws NOT_FOUND for an unknown id', async () => {
    await expect(service.getById('nope')).rejects.toThrow(NotFoundException);
  });
});
