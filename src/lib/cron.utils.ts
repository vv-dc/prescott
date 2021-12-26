export const cronEveryNSeconds = (seconds: number): string =>
  `*/${seconds} * * * * *`;

export const cronEveryNMinutes = (minutes: number): string =>
  `*/${minutes} * * * *`;
