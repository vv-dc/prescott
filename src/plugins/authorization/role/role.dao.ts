import { PgConnection } from '@model/shared/pg-connection';

export class RoleDao {
  constructor(private pg: PgConnection) {}

  async findByUserAndGroup(groupId: number, userId: number): Promise<string[]> {
    const roles = await this.pg('user_roles')
      .join('user_groups', 'user_roles.user_group_id', 'user_groups.id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where({
        'user_groups.group_id': groupId,
        'user_groups.user_id': userId,
      })
      .pluck<string[]>('roles.name');
    return roles;
  }
}
