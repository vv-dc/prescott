import { setTimeout } from 'node:timers/promises';
import { setImmediate } from 'node:timers';

export const asyncGeneratorToArray = async <T>(
  generator: AsyncGenerator<T>
): Promise<T[]> => {
  const array = [] as T[];
  for await (const item of generator) {
    array.push(item);
  }
  return array;
};

export const dispatchTask = (fn: () => Promise<unknown>): void => {
  // TODO: logging
  setImmediate(() => fn());
};

export class InMemoryMutex {
  private lockedResources = new Set<string>();

  constructor(private retryTimeout: number, private retryNumber: number) {}

  async run<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return this.runImpl(label, fn, 0);
  }

  private async runImpl<T>(
    resource: string,
    fn: () => Promise<T>,
    retryIdx: number
  ): Promise<T> {
    if (retryIdx >= this.retryNumber) {
      throw new Error(
        `InMemoryMutex: [${this.retryNumber}] retries exceeded for ${resource}`
      );
    }
    if (this.lockedResources.has(resource)) {
      await setTimeout(this.retryTimeout);
      return await this.runImpl(resource, fn, retryIdx + 1);
    }
    try {
      this.lockedResources.add(resource);
      return await fn();
    } finally {
      this.lockedResources.delete(resource);
    }
  }
}
