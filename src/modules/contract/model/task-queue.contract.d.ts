import { Contract } from '@modules/contract/model/contract';

export type EnqueueTaskFn = () => Promise<void>;

export interface TaskQueueContract extends Contract {
  enqueue(taskId: number, fn: EnqueueTaskFn): Promise<void>;
}
