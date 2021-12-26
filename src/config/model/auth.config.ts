import { PasswordConfig } from '@config/model/password.config';
import { JwtConfig } from '@config/model/jwt.config';

export interface AuthConfig {
  passwordConfig: PasswordConfig;
  jwtConfig: JwtConfig;
  maxSessions: number;
}
