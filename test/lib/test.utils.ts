export const getTimeoutRejectPromise = (timeout: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout elapsed'));
    }, timeout);
  });
