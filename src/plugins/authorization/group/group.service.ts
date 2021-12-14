import { GroupDao } from '@plugins/authorization/group/group.dao';
import { Group } from '@plugins/authorization/group/model/group';

export class GroupService {
  constructor(private dao: GroupDao) {}

  async findByName(groupName: string): Promise<Group | undefined> {
    const group = await this.dao.findByName(groupName);
    return group;
  }

  async create(groupName: string, ownerId: number): Promise<number> {
    const groupId = await this.dao.create(groupName, ownerId);
    return groupId;
  }
}
