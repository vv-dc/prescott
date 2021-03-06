import { AccessToken } from '@model/api/authentication/access-token';
import { Hook } from '@model/shared/hook';
import { GroupId } from '@model/api/authorization/group-id';

export type AuthorizationHook = Hook<{
  Params: GroupId;
  Headers: AccessToken;
}>;
