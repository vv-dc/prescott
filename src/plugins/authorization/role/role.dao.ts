import { PgConnection } from '@model/shared/pg-connection';
import { UserRole } from '@model/api/authorization/user-role';
import { Role } from '@plugins/authorization/role/model/role';

export class RoleDao {
  constructor(private pg: PgConnection) {}

  async findByName(name: string): Promise<Role | undefined> {
    const role = await this.pg<Role>('roles').where({ name }).first();
    return role;
  }

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

  async add(userGroupId: number, roleId: number): Promise<void> {
    await this.pg<UserRole>('user_roles').insert({ userGroupId, roleId });
  }

  async remove(userGroupId: number, roleId: number): Promise<void> {
    await this.pg<UserRole>('user_roles')
      .where({ userGroupId, roleId })
      .delete();
  }
}
