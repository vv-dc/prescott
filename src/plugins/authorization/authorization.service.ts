import { GroupService } from '@plugins/authorization/group/group.service';
import { RoleService } from '@plugins/authorization/role/role.service';
import { UserService } from '@plugins/user/user.service';
import {
  AccessDenied,
  EntityConflict,
  EntityNotFound,
} from '@modules/errors/abstract-errors';
import { Group } from '@plugins/authorization/group/model/group';

const SPECIAL_ROLES = ['group_manager', 'role_manager'];

export class AuthorizationService {
  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private roleService: RoleService
  ) {}

  async createGroup(groupName: string, userId: number): Promise<number> {
    const user = await this.userService.findById(userId);
    if (user === undefined) {
      throw new EntityNotFound('User does not exist');
    }
    const group = await this.groupService.findByName(groupName);
    if (group) {
      throw new EntityConflict('Group already exists');
    }
    const groupId = await this.groupService.create(groupName, userId);
    await this.groupService.addUser(groupId, userId);
    return groupId;
  }

  async deleteGroup(groupId: number): Promise<void> {
    await this.groupService.deleteById(groupId);
  }

  async addUserToGroup(groupId: number, userId: number): Promise<void> {
    const user = await this.userService.findById(userId);
    if (user === undefined) {
      throw new EntityNotFound('User does not exist');
    }
    const userInGroup = await this.groupService.checkUserInGroup(
      groupId,
      userId
    );
    if (userInGroup) {
      throw new EntityConflict('User already is a group member');
    }
    await this.groupService.addUser(groupId, userId);
  }

  async deleteUserFromGroup(
    groupId: number,
    managerId: number,
    userId: number
  ): Promise<void> {
    if (managerId === userId) {
      throw new EntityConflict('User can not the leave group in such a way');
    }
    const group = await this.groupService.findById(groupId);
    const { ownerId } = group as Group;

    if (managerId !== ownerId) {
      const roles = await this.roleService.findByGroupAndUser(groupId, userId);
      if (SPECIAL_ROLES.some(roles.includes)) {
        throw new AccessDenied('User do not have required privileges');
      }
    }
    await this.groupService.deleteUser(groupId, userId);
  }
}
