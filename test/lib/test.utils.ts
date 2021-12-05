import { randomUUID } from 'crypto';

export const getTimeoutRejectPromise = (timeout: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout elapsed'));
    }, timeout);
  });

export const generateRandomString = (prefix?: string): string =>
  (prefix ? `${prefix}_` : '') + randomUUID();
