import { v4 as uuidv4 } from 'uuid';

import { config, AUTH_CONFIG } from '@config/config';
import { AuthRegisterDto } from '@model/dto/auth-register.dto';
import { UserService } from '@plugins/user/user.service';
import { PasswordService } from '@plugins/auth/services/password.service';
import { AccessDenied, EntityConflict } from '@modules/errors/abstract-errors';
import { JwtService } from './jwt.service';
import { AuthLoginDto } from '@src/model/dto/auth-login.dto';
import { RefreshSessionService } from './refresh-session.service';
import { TokenPairDto } from '@src/model/dto/token-pair.dto';
import { UserPayload } from '@src/model/domain/user-payload';
import { RefreshSession } from '@src/model/domain/refresh-session';

const { maxSessions, jwtConfig } = config[AUTH_CONFIG];

export class AuthService {
  constructor(
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private refreshSessionService: RefreshSessionService,
    private userService: UserService
  ) {}

  async register(registerData: AuthRegisterDto): Promise<void> {
    const { email, login, password } = registerData;
    if (await this.userService.findByEmail(email)) {
      throw new EntityConflict('Email is already taken');
    }
    if (await this.userService.findByLogin(login)) {
      throw new EntityConflict('Login is already taken');
    }
    const hashedPassword = await this.passwordService.hash(password);
    await this.userService.add({ ...registerData, password: hashedPassword });
  }

  async login(loginData: AuthLoginDto, ip: string): Promise<TokenPairDto> {
    const { login, password } = loginData;
    const user = await this.userService.findByEmailOrLogin(login);
    if (!user) {
      throw new AccessDenied('Incorrect login');
    }
    const { id: userId, password: hashedPassword } = user;
    const session = await this.refreshSessionService.findByIp(userId, ip);
    if (session) {
      throw new AccessDenied('Already logged in');
    }
    const valid = await this.passwordService.verify(hashedPassword, password);
    if (!valid) {
      throw new AccessDenied('Incorrect password');
    }
    return await this.addRefreshSession(userId, ip);
  }

  async addRefreshSession(userId: number, ip: string): Promise<TokenPairDto> {
    const userRoles = await this.userService.findGroupRoles(userId);
    const userPayload = { userId, userRoles } as UserPayload;

    const accessToken = (await this.jwtService.sign(userPayload)) as string;
    const refreshToken = uuidv4();

    const sessions = await this.refreshSessionService.findByUser(userId);
    if (sessions.length >= maxSessions) {
      await this.refreshSessionService.deleteByUser(userId);
    }
    const refreshSession = {
      userId,
      refreshToken,
      ip,
      expiresIn: jwtConfig.refreshExpiresIn,
      createdAt: new Date(),
    } as RefreshSession;
    await this.refreshSessionService.add(refreshSession);
    return { accessToken, refreshToken };
  }
}
