import { Options } from 'argon2';

export type PasswordConfig = Options & { raw: false };
