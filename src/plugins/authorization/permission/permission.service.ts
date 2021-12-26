import { PermissionDao } from '@plugins/authorization/permission/permission.dao';

export class PermissionService {
  constructor(private dao: PermissionDao) {}

  async findByUserAndGroup(groupId: number, userId: number): Promise<string[]> {
    return this.dao.findByUserAndGroup(groupId, userId);
  }
}
