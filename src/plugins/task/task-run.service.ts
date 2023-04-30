import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { TaskRun } from '@model/domain/task-run';

export class TaskRunService {
  constructor(private dao: TaskRunDao) {}

  countAll(taskId: number): Promise<number> {
    return this.dao.countByTaskId(taskId);
  }

  getAll(taskId: number): Promise<TaskRun[]> {
    return this.dao.findAllByTaskId(taskId);
  }

  async start(runHandle: TaskRunHandle): Promise<void> {
    const { handleId, taskId } = runHandle;
    await this.dao.create({
      taskId,
      handleId,
      startedAt: new Date(),
      status: 'running',
    });
  }

  async finish(runHandle: TaskRunHandle, isSuccess: boolean): Promise<void> {
    const { taskId } = runHandle;
    await this.dao.update(taskId, {
      finishedAt: new Date(),
      status: isSuccess ? 'succeed' : 'failed',
    });
  }
}
