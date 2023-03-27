import { JwtPayload, sign, verify } from 'jsonwebtoken';

import { JwtConfig } from '@config/model/jwt.config';

export class JwtService {
  constructor(private options: JwtConfig) {}

  sign(payload: JwtPayload): Promise<string | undefined> {
    const { secret, accessExpiresIn: expiresIn } = this.options;

    return new Promise((resolve, reject) => {
      sign(payload, secret, { expiresIn }, (error, token) => {
        error ? reject(error) : resolve(token);
      });
    });
  }

  async verify(token: string): Promise<JwtPayload | undefined | string> {
    const { secret } = this.options;

    return new Promise((resolve, reject) => {
      verify(token, secret, (error, payload) => {
        error ? reject(error) : resolve(payload);
      });
    });
  }
}
