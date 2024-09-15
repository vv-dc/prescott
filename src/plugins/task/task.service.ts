import { getLogger } from '@logger/logger';
import { BadRequest, EntityConflict } from '@modules/errors/abstract-errors';
import { errorToReason } from '@modules/errors/get-error-reason';
import { TaskDao } from '@plugins/task/task.dao';
import { buildTaskUniqueName } from '@plugins/task/task.utils';
import { TaskExecutorService } from '@plugins/task/task-executor.service';
import { TaskRunService } from '@plugins/task/task-run.service';
import { Task } from '@model/domain/task';
import { TaskConfigDto, LocalTaskConfig } from '@model/dto/task-config.dto';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { TaskCallbackFn } from '@plugins/task/model/task-callback-fn';
import { ExecuteTaskFn } from '@modules/contract/model/task-queue.contract';

export class TaskService {
  private readonly logger = getLogger('task-service');

  constructor(
    private readonly dao: TaskDao,
    private readonly executorService: TaskExecutorService,
    private readonly runService: TaskRunService
  ) {}

  async registerFromDatabase(): Promise<void> {
    const tasks = await this.dao.findAllByActive(true);
    for (const task of tasks) {
      const { id: taskId, config } = task;
      await this.enqueuePendingRuns(task);

      const taskConfig: TaskConfigDto = JSON.parse(config);
      await this.register(taskId, taskConfig);
    }
    this.logger.info(`registerFromDatabase: registered ${tasks.length} tasks`);
  }

  private async enqueuePendingRuns(task: Task): Promise<void> {
    const { id: taskId } = task;
    const pendingRuns = await this.runService.getAllByStatus(taskId, 'pending');

    for (const taskRun of pendingRuns) {
      const { id: runId, rank: runRank } = taskRun;
      const runHandle: TaskRunHandle = { taskId, runId, runRank };
      const executorFn = this.buildExecutorFn(runHandle);
      await this.executorService.enqueueExecutable(taskId, executorFn);
    }

    this.logger.info(
      `enqueuePendingRuns[taskId=${taskId}]: ${pendingRuns.length} runs`
    );
  }

  async register(taskId: number, taskConfig: TaskConfigDto): Promise<void> {
    const callbackFn = this.buildTaskCallbackFn();
    await this.executorService.scheduleExecutable(
      taskId,
      taskConfig,
      callbackFn
    );
    this.logger.info(`register[taskId=${taskId}]: name=${taskConfig.name}`);
  }

  private buildTaskCallbackFn(): TaskCallbackFn {
    return async (taskId) => {
      const [isActive, task] = await this.isTaskActive(taskId);
      if (!isActive) {
        this.logger.warn(`callbackFn[taskId=${taskId}]: skip - is not allowed`);
        return null;
      }
      const config: TaskConfigDto = JSON.parse((task as Task).config);
      const taskRun = await this.runService.tryToRegister(taskId, config.times);
      if (taskRun === null) {
        await this.executorService.unscheduleExecutable(taskId);
        return null;
      }
      const runHandle: TaskRunHandle = {
        taskId,
        runId: taskRun.id,
        runRank: taskRun.rank,
      };
      return this.buildExecutorFn(runHandle);
    };
  }

  private buildExecutorFn(runHandle: TaskRunHandle): ExecuteTaskFn {
    return () => this.runTask(runHandle);
  }

  private async runTask(runHandle: TaskRunHandle): Promise<void> {
    try {
      await this.runTaskImpl(runHandle);
    } catch (err) {
      const { taskId, runId } = runHandle;
      const reason = errorToReason(err);
      this.logger.warn(
        `runTask[taskId=${taskId}, runId=${runId}]: failed - ${reason}`
      );
      await this.stopTask(taskId);
    }
  }

  // task is like a clean function, so there is no need to re-build it
  private async runTaskImpl(runHandle: TaskRunHandle): Promise<void> {
    const { taskId } = runHandle;
    const [isRunAllowed, task] = await this.isTaskActive(taskId);
    if (!isRunAllowed) {
      this.logger.warn(`runTask[taskId=${taskId}]: skip - is not allowed`);
      return;
    }

    const taskConfig: TaskConfigDto = JSON.parse((task as Task).config);
    const { config, times } = taskConfig;

    const envHandle = await this.executorService.runExecutable(taskId, config);
    await this.runService.start(runHandle, envHandle);
    const exitCode: number = await envHandle.wait();
    await this.runService.finish(runHandle, exitCode === 0);

    await envHandle.delete({ isForce: false });
    this.logger.info(`runTask[taskId=${taskId}]: exitCode=${exitCode}`);

    if (times !== undefined && runHandle.runRank >= times) {
      await this.executorService.stopExecutable(taskId, 'system');
      await this.executorService.deleteExecutableEnv(taskId);
      await this.dao.setActive(taskId, false);
      this.logger.info(`runTask[taskId=${taskId}]: stop - no runs left`);
    }
  }

  private async isTaskActive(taskId: number): Promise<[boolean, Task | null]> {
    const task = await this.dao.findById(taskId);
    if (task === undefined) {
      this.logger.warn(`isTaskActive[taskId=${taskId}]: does not exist`);
      return [false, null];
    }
    if (!task.active) {
      this.logger.warn(`isTaskActive[taskId=${taskId}]: is NOT active`);
      return [false, task];
    }
    return [true, task];
  }

  async createTask(
    groupId: number,
    userId: number,
    taskConfig: TaskConfigDto
  ): Promise<number> {
    const uniqueName = buildTaskUniqueName(groupId, taskConfig.name);
    if ((await this.dao.findByName(uniqueName)) !== undefined) {
      throw new EntityConflict(`Task with name=${uniqueName} already exists`);
    }

    const taskId = await this.dao.create({
      userId,
      groupId,
      name: uniqueName,
      active: true,
      config: JSON.stringify(taskConfig),
    });
    await this.register(taskId, taskConfig);

    this.logger.info(`createTask[taskId=${taskId}]: created`);
    return taskId;
  }

  async deleteTask(taskId: number): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    if (task.active) {
      this.logger.warn(`deleteTask[taskId=${taskId}]: task is active`);
      throw new BadRequest(`Cannot delete active task: taskId=${taskId}`);
    }
    await this.executorService.deleteExecutable(taskId);
    await this.runService.flushAll(taskId);
    await this.dao.delete(taskId);
    this.logger.info(`deleteTask[taskId=${taskId}]: deleted`);
  }

  async stopTask(taskId: number): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    if (!task.active) {
      this.logger.warn(`stopTask[taskId=${taskId}]: task is NOT active`);
      throw new BadRequest(`Cannot stop NOT active task: taskId=${taskId}`);
    }
    await this.dao.setActive(taskId, false);
    await this.executorService.stopExecutable(taskId, 'user');
    await this.runService.stopAll(taskId);
    this.logger.info(`stopTask[taskId=${taskId}]: set active=false`);
  }

  async startTask(taskId: number): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    if (task.active) {
      this.logger.warn(`startTask[taskId=${taskId}]: task is active`);
      throw new BadRequest(`Cannot start active task: taskId=${taskId}`);
    }
    const taskConfig = JSON.parse(task.config);
    await this.register(taskId, taskConfig);
    await this.dao.setActive(taskId, true);
    this.logger.info(`startTask[${taskId}]: set active=true`);
  }

  async updateTask(taskId: number, taskConfig: LocalTaskConfig): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    const oldConfig = JSON.parse(task.config);
    const newConfig: TaskConfigDto = { ...oldConfig, config: taskConfig };

    const callbackFn = this.buildTaskCallbackFn();
    await this.executorService.updateExecutable(taskId, newConfig, callbackFn);
    await this.dao.update(taskId, JSON.stringify(newConfig));
    this.logger.info(`updateTask[taskId=${taskId}]: updated`);
  }

  async getTask(taskId: number): Promise<Task | { config: TaskConfigDto }> {
    const task = await this.dao.findByIdThrowable(taskId);
    const configDto: TaskConfigDto = JSON.parse(task.config);
    return { ...task, name: configDto.name, config: configDto };
  }
}
