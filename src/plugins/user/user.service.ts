import { User } from '@model/domain/user';
import { AuthRegisterDto } from '@model/dto/auth-register.dto';
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

  async add(user: AuthRegisterDto): Promise<void> {
    await this.dao.add(user);
  }
}
