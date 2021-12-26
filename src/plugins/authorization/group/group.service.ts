import { GroupDao } from '@plugins/authorization/group/group.dao';
import { Group } from '@plugins/authorization/group/model/group';
import { UserGroup } from '@plugins/authorization/group/model/user-group';

export class GroupService {
  constructor(private dao: GroupDao) {}

  async findByName(groupName: string): Promise<Group | undefined> {
    return this.dao.findByName(groupName);
  }

  async findById(groupId: number): Promise<Group | undefined> {
    return this.dao.findById(groupId);
  }

  async findUserGroup(
    groupId: number,
    userId: number
  ): Promise<UserGroup | undefined> {
    return this.dao.findUserGroup(groupId, userId);
  }

  async checkUserInGroup(groupId: number, userId: number): Promise<boolean> {
    return this.dao.checkUserInGroup(groupId, userId);
  }

  async addUser(groupId: number, userId: number): Promise<void> {
    await this.dao.addUser(groupId, userId);
  }

  async deleteUser(groupId: number, userId: number): Promise<void> {
    await this.dao.deleteUser(groupId, userId);
  }

  async create(groupName: string, ownerId: number): Promise<number> {
    return this.dao.create(groupName, ownerId);
  }

  async deleteById(groupId: number): Promise<void> {
    await this.dao.deleteById(groupId);
  }
}
