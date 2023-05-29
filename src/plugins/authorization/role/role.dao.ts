import { Role } from '@plugins/authorization/role/model/role';
import { DbConnection } from '@model/shared/db-connection';
import { UserRole } from '@model/domain/user-role';

export class RoleDao {
  constructor(private db: DbConnection) {}

  async findByName(name: string): Promise<Role | undefined> {
    return this.db<Role>('roles').where({ name }).first();
  }

  async findByUserAndGroup(groupId: number, userId: number): Promise<string[]> {
    return this.db('user_roles')
      .join('user_groups', 'user_roles.user_group_id', 'user_groups.id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where({
        'user_groups.group_id': groupId,
        'user_groups.user_id': userId,
      })
      .pluck<string[]>('roles.name');
  }

  async add(userGroupId: number, roleId: number): Promise<void> {
    await this.db<UserRole>('user_roles').insert({ userGroupId, roleId });
  }

  async remove(userGroupId: number, roleId: number): Promise<void> {
    await this.db<UserRole>('user_roles')
      .where({ userGroupId, roleId })
      .delete();
  }
}
