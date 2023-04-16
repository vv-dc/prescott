import { randomUUID } from 'crypto';
import { randomInt } from 'node:crypto';

export const generateRandomString = (prefix?: string): string =>
  (prefix ? `${prefix}_` : '') + randomUUID();

export const generateRandomIp = (): string =>
  Array.from({ length: 4 }, () => randomInt(0, 255)).join('.');

export const generateRandomEmail = (): string =>
  `${generateRandomString()}@prescott.dev`;
