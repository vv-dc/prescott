import { PgConnection } from '@model/shared/pg-connection';

export class PermissionDao {
  constructor(private pg: PgConnection) {}

  async findByUserAndGroup(groupId: number, userId: number): Promise<string[]> {
    return this.pg('role_permissions as rp')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
      .join('user_groups', 'user_roles.user_group_id', 'user_groups.id')
      .where({
        'user_groups.group_id': groupId,
        'user_groups.user_id': userId,
      })
      .pluck<string[]>('permissions.name');
  }
}
