import { setTimeout } from 'node:timers/promises';
import { getLogger } from '@logger/logger';
import { errorToReason } from '@modules/errors/get-error-reason';

const logger = getLogger('async-utils');

export const dispatchTask = (fn: () => Promise<unknown>): void => {
  fn().catch((err) => {
    const reason = errorToReason(err);
    const fnName = fn.name || 'anonymous';
    logger.error(`dispatchTask: failed for ${fnName} - ${reason}`);
  });
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
