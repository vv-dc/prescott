import { ExecuteTaskFn } from '@modules/contract/model/queue/task-queue.contract';
import { BuildEnvResultDto } from '@src/modules/contract/model/env/env-builder.contract';

export type TaskOnRunCallbackFn = (
  taskId: number
) => Promise<ExecuteTaskFn | null>;

export type TaskAfterBuildCallbackFn = (
  taskId: number,
  buildResult: BuildEnvResultDto
) => Promise<void>;
