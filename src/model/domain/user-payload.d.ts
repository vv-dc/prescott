import { JwtPayload } from 'jsonwebtoken';

import { UserRoles } from '@model/domain/user-roles';

export interface UserPayload extends JwtPayload {
  userId: number;
  userRoles: UserRoles;
}
