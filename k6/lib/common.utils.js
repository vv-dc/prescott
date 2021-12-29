export const encodeBase64 = (str) =>
  Buffer.from(str, 'utf-8').toString('base64');
