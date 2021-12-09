import { AuthRegisterDto } from '@model/dto/auth-register.dto';
import { UserService } from '@plugins/user/user.service';
import { PasswordService } from '@plugins/auth/services/password.service';
import { EntityConflict } from '@modules/errors/abstract-errors';
import { JwtService } from './jwt.service';

export class AuthService {
  constructor(
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private userService: UserService
  ) {}

  async register(registerData: AuthRegisterDto): Promise<void> {
    const { email, login, password } = registerData;

    if (await this.userService.findByEmail(email)) {
      throw new EntityConflict('Email is already taken');
    }

    if (await this.userService.findByLogin(login)) {
      throw new EntityConflict('Login is already taken');
    }

    const hashedPassword = await this.passwordService.hash(password);
    await this.userService.add({ ...registerData, password: hashedPassword });
  }
}
