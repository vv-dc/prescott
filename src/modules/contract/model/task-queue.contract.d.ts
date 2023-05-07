import { Contract } from '@modules/contract/model/contract';

export type ExecuteTaskFn = () => Promise<void>;

export interface TaskQueueContract extends Contract {
  enqueue(taskId: number, fn: ExecuteTaskFn): Promise<void>;
}
