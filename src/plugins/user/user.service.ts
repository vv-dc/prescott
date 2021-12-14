import { User } from '@model/domain/user';
import { AuthRegisterDto } from '@model/dto/auth-register.dto';
import { UserDao } from '@plugins/user/user.dao';
import { UserRoles } from '@src/model/domain/user-roles';

export class UserService {
  constructor(private dao: UserDao) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.dao.findByEmail(email);
    return user;
  }

  async findByLogin(login: string): Promise<User | undefined> {
    const user = await this.dao.findByLogin(login);
    return user;
  }

  async findByEmailOrLogin(criterion: string): Promise<User | undefined> {
    const user = await this.dao.findByEmailOrLogin(criterion);
    return user;
  }

  async findGroupRoles(userId: number): Promise<UserRoles> {
    const groupRoles = await this.dao.findGroupRoles(userId);
    const userRoles = {} as UserRoles;
    for (const { groupId, roleId } of groupRoles) {
      if (!(groupId in userRoles)) {
        userRoles[groupId] = [];
      }
      userRoles[groupId].push(roleId);
    }
    return userRoles;
  }

  async create(user: AuthRegisterDto): Promise<void> {
    await this.dao.add(user);
  }
}
