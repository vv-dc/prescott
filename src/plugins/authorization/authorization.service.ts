import { GroupService } from '@plugins/authorization/group/group.service';
import { RoleService } from '@plugins/authorization/role/role.service';
import { UserService } from '@plugins/user/user.service';
import { Group } from '@plugins/authorization/group/model/group';
import { Role } from '@plugins/authorization/role/model/role';
import {
  AccessDenied,
  EntityConflict,
  EntityNotFound,
} from '@modules/errors/abstract-errors';

const ROLES = ['group_manager', 'role_manager'];

export class AuthorizationService {
  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private roleService: RoleService
  ) {}

  async createGroup(groupName: string, userId: number): Promise<number> {
    const group = await this.groupService.findByName(groupName);
    if (group !== undefined) {
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

      if (ROLES.some(roles.includes) || userId === ownerId) {
        throw new AccessDenied('User do not have required privileges');
      }
    }
    await this.groupService.deleteUser(groupId, userId);
  }

  async addUserRole(
    groupId: number,
    managerId: number,
    userId: number,
    roleName: string
  ): Promise<void> {
    if (managerId === userId) {
      throw new EntityConflict('User can not add role to himself');
    }
    const userRoles = await this.roleService.findByGroupAndUser(
      groupId,
      userId
    );
    const group = await this.groupService.findById(groupId);
    const { ownerId } = group as Group;

    if (managerId !== ownerId && ROLES.some(userRoles.includes)) {
      throw new AccessDenied('User must be an owner to add this role');
    }
    if (userRoles.includes(roleName)) {
      throw new AccessDenied('User already has this role');
    }
    const role = await this.roleService.findByName(roleName);
    const { id: roleId } = role as Role;

    await this.roleService.add(groupId, userId, roleId);
  }

  async deleteUserRole(
    groupId: number,
    managerId: number,
    userId: number,
    roleName: string
  ): Promise<void> {
    if (managerId === userId) {
      throw new EntityConflict('User can not remove own role');
    }
    const group = await this.groupService.findById(groupId);
    const { ownerId } = group as Group;

    if (managerId !== ownerId && ROLES.includes(roleName)) {
      throw new AccessDenied('User must be an owner to remove this role');
    }
    const role = await this.roleService.findByName(roleName);
    const { id: roleId } = role as Role;

    await this.roleService.remove(groupId, userId, roleId);
  }
}
