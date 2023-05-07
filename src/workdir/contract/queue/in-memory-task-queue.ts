import { getLogger } from '@logger/logger';
import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/task-queue.contract';
import { ContractOpts } from '@modules/contract/model/contract';

const config = { maxConcurrency: Infinity };
const logger = getLogger('in-memory-task-queue');

const queue: ExecuteTaskFn[] = [];
let running = 0;

const init = async (opts: ContractOpts): Promise<void> => {
  if (opts.maxConcurrency) {
    config.maxConcurrency = +opts.maxConcurrency;
  }
};

const enqueue = async (
  taskId: number,
  executorFn: ExecuteTaskFn
): Promise<void> => {
  const decoratedExecutor = decorateExecutorFn(taskId, executorFn);
  queue.push(decoratedExecutor);
  executeNext(); // should not await it
};

const executeNext = async (): Promise<void> => {
  logger.debug(
    `executeNext: buffer=${queue.length}, load=${running}/${config.maxConcurrency}`
  );
  if (running >= config.maxConcurrency || queue.length === 0) {
    return;
  }
  const nextTask = queue.shift() as ExecuteTaskFn;
  ++running;
  try {
    await nextTask();
  } finally {
    --running;
    executeNext();
  }
};

const decorateExecutorFn = (
  taskId: number,
  executorFn: ExecuteTaskFn
): ExecuteTaskFn => {
  return async () => {
    try {
      const startTime = Date.now();
      await executorFn();
      const elapsedMs = Date.now() - startTime;
      logger.info(`Done[taskId=${taskId}]: took ${elapsedMs}ms`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      logger.warn(`Failed[taskId=${taskId}]: ${reason}`);
      throw err;
    }
  };
};

const taskQueue: TaskQueueContract = {
  init,
  enqueue,
};

export default {
  buildContract: () => taskQueue,
};
