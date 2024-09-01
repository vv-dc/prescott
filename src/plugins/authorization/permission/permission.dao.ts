import { DbConnection } from '@model/shared/db-connection';

export class PermissionDao {
  constructor(private db: DbConnection) {}

  async findByUserAndGroup(groupId: number, userId: number): Promise<string[]> {
    return this.db('role_permissions as rp')
      .join('permissions', 'rp.permission_id', 'permissions.id')
      .join('user_roles', 'rp.role_id', 'user_roles.role_id')
      .join('user_groups', 'user_roles.user_group_id', 'user_groups.id')
      .where({
        'user_groups.group_id': groupId,
        'user_groups.user_id': userId,
      })
      .pluck<string[]>('permissions.name');
  }
}
