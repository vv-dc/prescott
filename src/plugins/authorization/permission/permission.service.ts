import { PermissionDao } from '@plugins/authorization/permission/permission.dao';

export class PermissionService {
  constructor(private dao: PermissionDao) {}

  async findByUserAndGroup(groupId: number, userId: number): Promise<string[]> {
    const permissions = await this.dao.findByUserAndGroup(groupId, userId);
    return permissions;
  }
}
