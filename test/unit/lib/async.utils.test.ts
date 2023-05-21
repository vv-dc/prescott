import { setTimeout } from 'node:timers/promises';
import { InMemoryMutex } from '@lib/async.utils';
import { generateRandomString } from '@lib/random.utils';

describe('async.utils unit', () => {
  describe('InMemoryMutex', () => {
    it('should lock resource and do retries', async () => {
      const mockFn = jest.fn();
      const mockLabel = generateRandomString('mutex-test');

      const mutex = new InMemoryMutex(100, 5);

      // do not wait for it intentionally
      const firstRunPromise = mutex.run(mockLabel, async () => {
        await setTimeout(5_000);
      });

      // should retry 5 times and then throw
      const startTime = Date.now();
      await expect(mutex.run(mockLabel, mockFn)).rejects.toThrow();
      const elapsedMs = Date.now() - startTime;
      expect(elapsedMs).toBeGreaterThanOrEqual(500);

      // should not be locked here
      await mutex.run('some-other-label', mockFn);
      expect(mockFn).toBeCalledTimes(1);

      await firstRunPromise; // wait until unlocked
      await mutex.run(mockLabel, mockFn);

      expect(mockFn).toBeCalledTimes(2);
    });
  });
});
