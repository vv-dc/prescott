import { PgConnection } from '@model/shared/pg-connection';
import { User } from '@model/domain/user';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';

export class UserDao {
  constructor(private pg: PgConnection) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return this.pg<User>('users').where({ email }).first();
  }

  async findByLogin(login: string): Promise<User | undefined> {
    return this.pg<User>('users').where({ login }).first();
  }

  async findByEmailOrLogin(criterion: string): Promise<User | undefined> {
    return this.pg<User>('users')
      .where({ login: criterion })
      .orWhere({ email: criterion })
      .first();
  }

  async findById(id: number): Promise<User | undefined> {
    return this.pg<User>('users').where({ id }).first();
  }

  async add(user: AuthenticationRegisterDto): Promise<void> {
    await this.pg<AuthenticationRegisterDto>('users').insert(user);
  }
}
