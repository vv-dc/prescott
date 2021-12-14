import { GroupService } from '@plugins/authorization/group/group.service';
import { RoleService } from '@plugins/authorization/role/role.service';
import { EntityConflict } from '@modules/errors/abstract-errors';

export class AuthorizationService {
  constructor(
    private groupService: GroupService,
    private roleService: RoleService
  ) {}

  async createGroup(groupName: string, userId: number): Promise<number> {
    const group = await this.groupService.findByName(groupName);
    if (group) {
      throw new EntityConflict('Group already exists');
    }
    const groupId = await this.groupService.create(groupName, userId);
    return groupId;
  }

  // async findGroupRoles(userId: number): Promise<GroupRoles[]> {
  //   const groupRoles = await this.pg('user_roles')
  //     .select<GroupRoles[]>(
  //       'user_groups.group_id as group_id',
  //       'user_roles.role_id as role_id'
  //     )
  //     .join('user_groups', 'user_roles.user_group_id', 'user_groups.id')
  //     .where('user_groups.user_id', userId);
  //   return groupRoles;
  // }

  // async findGroupRoles(userId: number): Promise<UserRoles> {
  //   const groupRoles = await this.dao.findGroupRoles(userId);
  //   const userRoles = {} as UserRoles;
  //   for (const { groupId, roleId } of groupRoles) {
  //     if (!(groupId in userRoles)) {
  //       userRoles[groupId] = [];
  //     }
  //     userRoles[groupId].push(roleId);
  //   }
  //   return userRoles;
  // }
}
