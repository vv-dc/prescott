import { PgConnection } from '@model/shared/pg-connection';
import { User } from '@model/domain/user';
import { AuthRegisterDto } from '@src/model/dto/auth-register.dto';
import { GroupRoles } from '@src/model/domain/group-roles';

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

  async findGroupRoles(userId: number): Promise<GroupRoles[]> {
    const groupRoles = await this.pg<GroupRoles>('user_roles')
      .select(
        'user_groups.group_id as group_id',
        'user_roles.role_id as role_id'
      )
      .join('user_groups', 'user_roles.user_group_id', 'user_groups.id')
      .where('user_groups.user_id', userId);
    return groupRoles;
  }

  async add(user: AuthRegisterDto): Promise<void> {
    await this.pg<AuthRegisterDto>('users').insert(user);
  }
}
