import { AuthorizationHook } from '@plugins/authorization/model/authorization-hook';

export interface AuthHooks {
  groupOwnerHook: AuthorizationHook;
  permissionHook: (permission: string) => AuthorizationHook;
  roleHook: (role: string) => AuthorizationHook;
}
