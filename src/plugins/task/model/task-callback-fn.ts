import { ExecuteTaskFn } from '@modules/contract/model/task-queue.contract';

export type TaskCallbackFn = (taskId: number) => Promise<ExecuteTaskFn | null>;
