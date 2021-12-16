import { GroupDao } from '@plugins/authorization/group/group.dao';
import { Group } from '@plugins/authorization/group/model/group';

export class GroupService {
  constructor(private dao: GroupDao) {}

  async findByName(groupName: string): Promise<Group | undefined> {
    const group = await this.dao.findByName(groupName);
    return group;
  }

  async findById(groupId: number): Promise<Group | undefined> {
    const group = await this.dao.findById(groupId);
    return group;
  }

  async checkUserInGroup(groupId: number, userId: number): Promise<boolean> {
    const exists = await this.dao.checkUserInGroup(groupId, userId);
    return exists;
  }

  async addUser(groupId: number, userId: number): Promise<void> {
    await this.dao.addUser(groupId, userId);
  }

  async deleteUser(groupId: number, userId: number): Promise<void> {
    await this.dao.deleteUser(groupId, userId);
  }

  async create(groupName: string, ownerId: number): Promise<number> {
    const groupId = await this.dao.create(groupName, ownerId);
    return groupId;
  }

  async deleteById(groupId: number): Promise<void> {
    await this.dao.deleteById(groupId);
  }
}
