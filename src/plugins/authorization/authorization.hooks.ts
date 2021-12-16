import { GroupService } from '@plugins/authorization/group/group.service';
import { PermissionService } from '@plugins/authorization/permission/permission.service';
import { AuthorizationHook } from '@plugins/authorization/model/authorization-hook';
import { RoleService } from '@plugins/authorization/role/role.service';
import {
  HttpError,
  HttpNotFound,
  HttpUnauthorized,
} from '@modules/errors/http-errors';
import { replyWithError } from '@modules/fastify/reply-with-error';

export const makeAuthHooks = (
  groupService: GroupService,
  permissionService: PermissionService,
  roleService: RoleService
) => {
  const isGroupOwnerThrowable = async (
    groupId: number,
    userId: number
  ): Promise<boolean> => {
    const group = await groupService.findById(groupId);
    if (!group) {
      throw new HttpNotFound('Group does not exist');
    }
    return group.ownerId === userId;
  };

  const groupOwnerHook: AuthorizationHook = async (request, reply) => {
    const { groupId } = request.params;
    const { userId } = request.payload;
    try {
      if (!(await isGroupOwnerThrowable(groupId, userId))) {
        throw new HttpUnauthorized('User is not a group owner');
      }
    } catch (error) {
      return replyWithError(reply, error as HttpError);
    }
  };

  const permissionHook = (permission: string): AuthorizationHook => {
    const checkPermissionHook: AuthorizationHook = async (request, reply) => {
      const { groupId } = request.params;
      const { userId } = request.payload;
      try {
        if (await isGroupOwnerThrowable(groupId, userId)) {
          return;
        }
        const permissions = await permissionService.findByUserAndGroup(
          groupId,
          userId
        );
        if (!permissions.includes(permission)) {
          throw new HttpUnauthorized('User do not have required permission');
        }
      } catch (error) {
        return replyWithError(reply, error as HttpError);
      }
    };
    return checkPermissionHook;
  };

  const roleHook = (role: string): AuthorizationHook => {
    const checkRoleHook: AuthorizationHook = async (request, reply) => {
      const { groupId } = request.params;
      const { userId } = request.payload;
      try {
        if (await isGroupOwnerThrowable(groupId, userId)) {
          return;
        }
        const roles = await roleService.findByGroupAndUser(groupId, userId);
        if (!roles.includes(role)) {
          throw new HttpUnauthorized('User do not have required privileges');
        }
      } catch (error) {
        return replyWithError(reply, error as HttpError);
      }
    };
    return checkRoleHook;
  };
  return { groupOwnerHook, permissionHook, roleHook };
};
