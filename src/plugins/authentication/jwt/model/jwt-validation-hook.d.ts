import { Hook } from '@model/shared/hook';

export type JwtValidationHook = Hook<{
  Headers: { authorization?: string };
}>;
