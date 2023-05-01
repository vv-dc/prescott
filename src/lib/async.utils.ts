import { setTimeout } from 'node:timers/promises';

export const asyncGeneratorToArray = async <T>(
  generator: AsyncGenerator<T>
): Promise<T[]> => {
  const array = [] as T[];
  for await (const item of generator) {
    array.push(item);
  }
  return array;
};

export class InMemoryMutex {
  private lockedResources = new Set<string>();

  constructor(private retryTimeout: number, private retryNumber: number) {}

  async run<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return this.runImpl(label, fn, 0);
  }

  private async runImpl<T>(
    label: string,
    fn: () => Promise<T>,
    retryIdx: number
  ): Promise<T> {
    if (retryIdx >= this.retryNumber) {
      throw new Error(`[${this.retryNumber}] of retries exceeded for ${label}`);
    }
    if (this.lockedResources.has(label)) {
      await setTimeout(this.retryTimeout);
      return await this.runImpl(label, fn, retryIdx + 1);
    }
    try {
      this.lockedResources.add(label);
      return await fn();
    } finally {
      this.lockedResources.delete(label);
    }
  }
}
