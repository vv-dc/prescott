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

export class TaskService {
  private readonly logger = getLogger('task-service');

  constructor(
    private readonly dao: TaskDao,
    private readonly executorService: TaskExecutorService,
    private readonly runService: TaskRunService
  ) {}

  async registerFromDatabase(): Promise<void> {
    const tasks = await this.dao.findAll();
    const activeTasks = tasks.filter((task) => task.active);
    for (const task of activeTasks) {
      const { id, config } = task;
      const taskConfig: TaskConfigDto = JSON.parse(config);
      await this.register(id, taskConfig);
    }
    this.logger.info(
      `registerFromDatabase: registered ${activeTasks.length}/${tasks.length} tasks`
    );
  }

  async register(taskId: number, taskConfig: TaskConfigDto): Promise<void> {
    const callbackFn = this.buildTaskCallbackFn();
    await this.executorService.registerExecutable(
      taskId,
      taskConfig,
      callbackFn
    );
    this.logger.info(`register[taskId=${taskId}]: name=${taskConfig.name}`);
  }

  private buildTaskCallbackFn(): TaskCallbackFn {
    return async (taskId) => {
      const task = await this.dao.findById(taskId); // to handle updates/deletions
      if (task === undefined) {
        this.logger.warn(`executorFn[taskId=${taskId}]: SKIP - doesn't exist`);
        return null;
      }
      const config: TaskConfigDto = JSON.parse(task.config);
      const [runHandle, runIndex] = await this.runService.tryToRegister(
        taskId,
        config.times
      );
      if (runHandle === null) {
        await this.executorService.unscheduleExecutable(taskId);
        return null;
      }
      return () => this.runTask(runHandle, runIndex, config);
    };
  }

  private async runTask(
    runHandle: TaskRunHandle,
    runIndex: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    try {
      await this.runTaskImpl(runHandle, runIndex, taskConfig);
    } catch (err) {
      const { taskId } = runHandle;
      const reason = errorToReason(err);
      this.logger.warn(`runTask[taskId=${taskId}]: failed - ${reason}`);
      await this.stopTask(taskId);
    }
  }

  // task is like a clean function, so there is no need to re-build it
  private async runTaskImpl(
    runHandle: TaskRunHandle,
    runIndex: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { taskId } = runHandle;
    const { times, config } = taskConfig;

    const envHandle = await this.executorService.runExecutable(taskId, config);
    await this.runService.start(runHandle, envHandle);
    const exitCode: number = await envHandle.wait();
    await this.runService.finish(runHandle, exitCode === 0);

    await envHandle.delete({ isForce: false });
    this.logger.info(`runTask[taskId]: completed - exitCode=${exitCode}`);

    if (runIndex === times) {
      await this.stopTask(taskId);
      await this.executorService.deleteExecutableEnv(taskId);
      this.logger.info(`runTask[taskId=${taskId}]: stop - no runs left`);
    }
  }

  async createTask(
    groupId: number,
    userId: number,
    taskConfig: TaskConfigDto
  ): Promise<number> {
    const { name } = taskConfig;
    if ((await this.dao.findByName(name)) !== undefined) {
      throw new EntityConflict(`Task with name=${name} already exists`);
    }

    const taskId = await this.dao.create({
      userId,
      groupId,
      name: buildTaskUniqueName(groupId, name),
      active: true,
      config: JSON.stringify(taskConfig),
    });
    await this.register(taskId, taskConfig);

    this.logger.info(`createTask[taskId=${taskId}]: created`);
    return taskId;
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.dao.findByIdThrowable(taskId);
    await this.executorService.deleteExecutable(taskId);
    await this.runService.flushAll(taskId);
    await this.dao.delete(taskId);
    this.logger.info(`deleteTask[taskId=${taskId}]: deleted`);
  }

  async stopTask(taskId: number): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    if (!task.active) {
      this.logger.warn(`stopTask[taskId=${taskId}]: task is NOT active`);
      throw new BadRequest(`Task is not active: taskId=${taskId}`);
    }
    await this.executorService.stopExecutable(taskId);
    await this.dao.setActive(taskId, false);
    this.logger.info(`stopTask[taskId=${taskId}]: set active=false`);
  }

  async startTask(taskId: number): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    if (task.active) {
      this.logger.warn(`startTask[taskId=${taskId}]: task is active`);
      throw new BadRequest(`Task is already active: taskId=${taskId}`);
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
