import { PgConnection } from '@model/shared/pg-connection';
import { User } from '@model/domain/user';
import { AuthRegisterDto } from '@src/model/dto/auth-register.dto';

export class UserDao {
  constructor(private pg: PgConnection) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.pg<User>('users').select().where({ email }).first();
    return user;
  }

  async findByLogin(login: string): Promise<User | undefined> {
    const user = await this.pg<User>('users').select().where({ login }).first();
    return user;
  }

  async add(user: AuthRegisterDto): Promise<void> {
    await this.pg.insert(user).into('users');
  }
}
