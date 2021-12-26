import { RoleDao } from '@plugins/authorization/role/role.dao';
import { GroupService } from '@plugins/authorization/group/group.service';
import { UserGroup } from '@plugins/authorization/group/model/user-group';
import { Role } from '@plugins/authorization/role/model/role';

export class RoleService {
  constructor(private dao: RoleDao, private groupService: GroupService) {}

  async findByName(roleName: string): Promise<Role | undefined> {
    return this.dao.findByName(roleName);
  }

  async findByGroupAndUser(groupId: number, userId: number): Promise<string[]> {
    return this.dao.findByUserAndGroup(groupId, userId);
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
