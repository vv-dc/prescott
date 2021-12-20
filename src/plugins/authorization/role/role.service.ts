import { RoleDao } from '@plugins/authorization/role/role.dao';
import { GroupService } from '@plugins/authorization/group/group.service';
import { UserGroup } from '@plugins/authorization/group/model/user-group';
import { Role } from '@plugins/authorization/role/model/role';

export class RoleService {
  constructor(private dao: RoleDao, private groupService: GroupService) {}

  async findByName(roleName: string): Promise<Role | undefined> {
    const role = await this.dao.findByName(roleName);
    return role;
  }

  async findByGroupAndUser(groupId: number, userId: number): Promise<string[]> {
    const roles = await this.dao.findByUserAndGroup(groupId, userId);
    return roles;
  }

  async add(groupId: number, userId: number, roleId: number): Promise<void> {
    const userGroup = await this.groupService.findUserGroup(groupId, userId);
    const { id: userGroupId } = userGroup as UserGroup;

    await this.dao.add(userGroupId, roleId);
  }

  async remove(groupId: number, userId: number, roleId: number): Promise<void> {
    const userGroup = await this.groupService.findUserGroup(groupId, userId);
    const { id: userGroupId } = userGroup as UserGroup;

    await this.dao.remove(userGroupId, roleId);
  }
}
