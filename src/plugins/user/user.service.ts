import { User } from '@model/domain/user';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';
import { UserDao } from '@plugins/user/user.dao';

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

  async create(user: AuthenticationRegisterDto): Promise<void> {
    await this.dao.add(user);
  }
}
