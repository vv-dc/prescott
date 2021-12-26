import { randomUUID } from 'crypto';

export const generateRandomString = (prefix?: string): string =>
  (prefix ? `${prefix}_` : '') + randomUUID();
