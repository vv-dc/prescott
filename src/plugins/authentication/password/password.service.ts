import * as argon2 from 'argon2';

import { PasswordConfig } from '@config/model/password.config';

export class PasswordService {
  constructor(private options: PasswordConfig) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password, this.options);
  }
}
