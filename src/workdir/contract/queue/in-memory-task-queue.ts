import { getLogger } from '@logger/logger';
import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/task-queue.contract';
import { ContractOpts } from '@modules/contract/model/contract';
import { errorToReason } from '@modules/errors/get-error-reason';

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
  const decoratedExecutorFn = decorateExecutorFn(taskId, executorFn);
  queue.push(decoratedExecutorFn);
  executeNext(); // should not await it
};

const executeNext = async (): Promise<void> => {
  if (running >= config.maxConcurrency || queue.length === 0) {
    logger.debug(
      `executeNext[skip]: buffer=${queue.length}, load=${running}/${config.maxConcurrency}`
    );
    return;
  }
  const nextTask = queue.shift() as ExecuteTaskFn;
  ++running;
  try {
    logger.debug(
      `executeNext[run]: buffer=${queue.length}, load=${running}/${config.maxConcurrency}`
    );
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
      await executorFn();
    } catch (err) {
      const reason = errorToReason(err);
      logger.warn(`executeNext[taskId=${taskId}]: failed - ${reason}`);
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
