export const encodeBase64 = (str: string) =>
  Buffer.from(str, 'utf-8').toString('base64');

export const decodeBase64 = (encoded: string) =>
  Buffer.from(encoded, 'base64').toString('utf-8');
