import {
  EnqueueTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/task-queue.contract';
import { ContractOpts } from '@modules/contract/model/contract';

const config = { workDir: '' };

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const enqueue = async (taskId: number, fn: EnqueueTaskFn): Promise<void> => {
  await fn();
};

const taskQueue: TaskQueueContract = {
  init,
  enqueue,
};

export default {
  buildContract: () => taskQueue,
};
