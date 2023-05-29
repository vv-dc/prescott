import { DbConnection } from '@model/shared/db-connection';
import { User } from '@model/domain/user';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';
import { parseDate } from '@lib/date.utils';

export class UserDao {
  constructor(private db: DbConnection) {}

  private mapUser(user: User): User {
    return {
      ...user,
      createdAt: parseDate(user.createdAt),
      updatedAt: parseDate(user.updatedAt),
    };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.db<User>('users').where({ email }).first();
    return user && this.mapUser(user);
  }

  async findByLogin(login: string): Promise<User | undefined> {
    const user = await this.db<User>('users').where({ login }).first();
    return user && this.mapUser(user);
  }

  async findByEmailOrLogin(criterion: string): Promise<User | undefined> {
    const user = await this.db<User>('users')
      .where({ login: criterion })
      .orWhere({ email: criterion })
      .first();
    return user && this.mapUser(user);
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await this.db<User>('users').where({ id }).first();
    return user && this.mapUser(user);
  }

  async add(user: AuthenticationRegisterDto): Promise<void> {
    await this.db<AuthenticationRegisterDto>('users').insert(user);
  }
}
