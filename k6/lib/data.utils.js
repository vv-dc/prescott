const ALPHABET = 'abcdefghijklmnopqrstuvwxyz1234567890';

export const generateRandomString = (length) =>
  Array.from(
    { length },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');

export const generateRandomEmail = () => generateRandomString(30) + '@mock.com';

export const generateRandomUser = () => ({
  login: `user_${generateRandomString(30)}`,
  fullName: 'Mock Mock',
  email: generateRandomEmail(),
  password: 'mock',
});
