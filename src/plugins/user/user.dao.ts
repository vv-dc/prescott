import { PgConnection } from '@model/shared/pg-connection';
import { User } from '@model/domain/user';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';

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

  async findByEmailOrLogin(criterion: string): Promise<User | undefined> {
    const user = await this.pg<User>('users')
      .select()
      .where({ login: criterion })
      .orWhere({ email: criterion })
      .first();
    return user;
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await this.pg<User>('users').select().where({ id }).first();
    return user;
  }

  async add(user: AuthenticationRegisterDto): Promise<void> {
    await this.pg<AuthenticationRegisterDto>('users').insert(user);
  }
}
