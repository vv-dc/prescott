export const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const millisecondsToSeconds = (ms: number) => ms / 1000;

export const secondsToMilliseconds = (s: number) => s * 1000;
