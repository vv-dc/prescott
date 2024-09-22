import { ExecuteTaskFn } from '@modules/contract/model/queue/task-queue.contract';

export type TaskCallbackFn = (taskId: number) => Promise<ExecuteTaskFn | null>;
