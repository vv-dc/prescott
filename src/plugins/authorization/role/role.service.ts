import { RoleDao } from '@plugins/authorization/role/role.dao';

export class RoleService {
  constructor(private dao: RoleDao) {}

  async findByGroupAndUser(groupId: number, userId: number): Promise<string[]> {
    const roles = await this.dao.findByUserAndGroup(groupId, userId);
    return roles;
  }
}
