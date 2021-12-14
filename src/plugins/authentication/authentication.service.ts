import { randomUUID } from 'crypto';

import { config, AUTH_CONFIG } from '@config/config';
import { UserService } from '@plugins/user/user.service';
import { PasswordService } from '@plugins/authentication/password/password.service';
import { JwtService } from '@plugins/authentication/jwt/jwt.service';
import { RefreshSessionService } from '@plugins/authentication/refresh-session/refresh-session.service';
import { RefreshSession } from '@plugins/authentication/refresh-session/model/refresh-session';
import {
  AccessDenied,
  EntityConflict,
  EntityNotFound,
  UnauthorizedUser,
} from '@modules/errors/abstract-errors';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';
import { AuthenticationLoginDto } from '@model/dto/authentication-login.dto';
import { TokenPairDto } from '@model/api/authentication/token-pair.dto';
import { UserPayload } from '@model/domain/user-payload';

const { maxSessions, jwtConfig } = config[AUTH_CONFIG];

export class AuthenticationService {
  constructor(
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private refreshSessionService: RefreshSessionService,
    private userService: UserService
  ) {}

  async register(registerData: AuthenticationRegisterDto): Promise<void> {
    const { email, login, password } = registerData;
    if (await this.userService.findByEmail(email)) {
      throw new EntityConflict('Email is already taken');
    }
    if (await this.userService.findByLogin(login)) {
      throw new EntityConflict('Login is already taken');
    }
    const hashedPassword = await this.passwordService.hash(password);
    await this.userService.create({
      ...registerData,
      password: hashedPassword,
    });
  }

  async login(
    loginData: AuthenticationLoginDto,
    ip: string
  ): Promise<TokenPairDto> {
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

  async refreshTokens(refreshToken: string, ip: string): Promise<TokenPairDto> {
    const session = await this.refreshSessionService.deleteByTokenAndGet(
      refreshToken
    );
    if (!session || session.ip !== ip) {
      throw new EntityNotFound('Invalid refresh session');
    }
    const { userId, expiresIn, createdAt } = session;
    const now = Date.now();
    const expirationTime = createdAt.getTime() + expiresIn;

    if (expirationTime < now) {
      throw new UnauthorizedUser('Token expired');
    }
    return await this.addRefreshSession(userId, ip);
  }

  async logout(refreshToken: string, ip: string): Promise<void> {
    const session = await this.refreshSessionService.deleteByTokenAndGet(
      refreshToken
    );
    if (!session || session.ip !== ip) {
      throw new EntityNotFound('Invalid refresh session');
    }
  }

  private async addRefreshSession(
    userId: number,
    ip: string
  ): Promise<TokenPairDto> {
    const userPayload = { userId } as UserPayload;

    const accessToken = (await this.jwtService.sign(userPayload)) as string;
    const refreshToken = randomUUID();

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
    await this.refreshSessionService.create(refreshSession);
    return { accessToken, refreshToken };
  }
}
