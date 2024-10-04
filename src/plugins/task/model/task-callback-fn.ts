import { ExecuteTaskFn } from '@modules/contract/model/queue/task-queue.contract';

export type TaskOnRunCallbackFn = (
  taskId: number
) => Promise<ExecuteTaskFn | null>;

export type TaskAfterBuildCallbackFn = (
  taskId: number,
  envKey: string
) => Promise<void>;
