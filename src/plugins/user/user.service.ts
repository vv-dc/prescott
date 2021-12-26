import { User } from '@model/domain/user';
import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';
import { UserDao } from '@plugins/user/user.dao';

export class UserService {
  constructor(private dao: UserDao) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return this.dao.findByEmail(email);
  }

  async findByLogin(login: string): Promise<User | undefined> {
    return this.dao.findByLogin(login);
  }

  async findByEmailOrLogin(criterion: string): Promise<User | undefined> {
    return this.dao.findByEmailOrLogin(criterion);
  }

  async findById(userId: number): Promise<User | undefined> {
    return this.dao.findById(userId);
  }

  async create(user: AuthenticationRegisterDto): Promise<void> {
    await this.dao.add(user);
  }
}
