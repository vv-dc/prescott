import { TokenPairDto } from '@model/dto/token-pair.dto';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';
import {
  generateRandomEmail,
  generateRandomIp,
  generateRandomString,
} from '@lib/random.utils';
import { AuthenticationService } from '@plugins/authentication/authentication.service';
import { AuthenticationLoginDto } from '@model/dto/authentication-login.dto';
import { AuthorizationService } from '@plugins/authorization/authorization.service';
import { JwtService } from '@plugins/authentication/jwt/jwt.service';
import { UserPayload } from '@model/domain/user-payload';

export interface GroupTestInstance {
  groupId: number;
  groupName: string;
}

export const createAndLoginTestUser = async (
  authService: AuthenticationService,
  jwtService: JwtService
): Promise<{ userId: number; tokenPair: TokenPairDto }> => {
  const registerDto: AuthenticationRegisterDto = {
    login: generateRandomString('login'),
    password: generateRandomString('pass'),
    email: generateRandomEmail(),
    fullName: `${generateRandomString()} ${generateRandomString()}`,
  };
  await authService.register(registerDto);

  const userIp = generateRandomIp();
  const loginDto: AuthenticationLoginDto = {
    login: registerDto.login,
    password: registerDto.password,
  };
  const tokenPair = await authService.login(loginDto, userIp);

  const { userId } = (await jwtService.verify(
    tokenPair.accessToken
  )) as UserPayload;

  return {
    userId,
    tokenPair,
  };
};

export const createTestGroup = async (
  authorizationService: AuthorizationService,
  userId: number
): Promise<GroupTestInstance> => {
  const groupName = generateRandomString('group');
  const groupId = await authorizationService.createGroup(groupName, userId);
  return { groupId, groupName };
};
