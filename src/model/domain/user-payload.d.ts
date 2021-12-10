import { UserRoles } from '@model/domain/user-roles';

export interface UserPayload {
  userId: number;
  userRoles: UserRoles;
}
