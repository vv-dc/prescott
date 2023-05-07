import { getLogger } from '@logger/logger';
import { TaskDao } from '@plugins/task/task.dao';
import { buildTaskUniqueName } from '@plugins/task/task.utils';
import { BadRequest, EntityConflict } from '@modules/errors/abstract-errors';
import {
  TaskConfigDto,
  LocalTaskConfig,
  RepositoryTaskConfig,
} from '@model/dto/task-config.dto';
import { Task } from '@model/domain/task';
import { TaskExecutorService } from '@plugins/task/task-executor.service';
import { TaskRunService } from '@plugins/task/task-run.service';
import { ExecuteTaskFn } from '@modules/contract/model/task-queue.contract';
import { errorToReason } from '@modules/errors/get-error-reason';

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
    const executorFn: ExecuteTaskFn = this.buildExecutorFn(taskId);
    await this.executorService.registerExecutable(
      taskId,
      taskConfig,
      executorFn
    );
    this.logger.info(`register[taskId=${taskId}]: name=${taskConfig.name}`);
  }

  private buildExecutorFn(taskId: number): ExecuteTaskFn {
    return async (): Promise<void> => {
      const task = await this.dao.findByIdThrowable(taskId); // to handle updates
      const taskConfig = JSON.parse(task.config);
      const runner = 'repository' in taskConfig.config ? 'runWatch' : 'runTask';
      await this[runner](taskId, JSON.parse(task.config));
    };
  }

  private async runTask(
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    try {
      await this.runTaskImpl(taskId, taskConfig);
    } catch (err) {
      const reason = errorToReason(err);
      this.logger.warn(`runTask[taskId=${taskId}]: failed - ${reason}`);
      await this.stopTask(taskId);
    }
  }

  // task is like a clean function, so there is no need to re-build it
  private async runTaskImpl(
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { times, config } = taskConfig;
    const [runHandle, runsLeft] = await this.runService.tryToRegister(
      taskId,
      times
    );
    if (runHandle === null) {
      await this.executorService.unscheduleExecutable(taskId);
      return;
    }

    const envHandle = await this.executorService.runExecutable(taskId, config);
    await this.runService.start(runHandle, envHandle);
    const exitCode: number = await envHandle.wait();
    await this.runService.finish(runHandle, exitCode === 0);

    await envHandle.delete({ isForce: false });
    this.logger.info(`runTask[taskId]: completed - exitCode=${exitCode}`);

    if (runsLeft === 0) {
      await this.stopTask(taskId);
      await this.executorService.deleteExecutableEnv(taskId);
      this.logger.info(`runTask[taskId=${taskId}]: stop - no runs left`);
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async runWatch(taskId: number, config: TaskConfigDto): Promise<void> {
    // TODO: try to clone, build and then run
  }
  // eslint-enable @typescript-eslint/no-unused-vars

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

  async updateTask(
    taskId: number,
    taskConfig: LocalTaskConfig | RepositoryTaskConfig
  ): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    const oldConfig = JSON.parse(task.config);
    const newConfig: TaskConfigDto = { ...oldConfig, config: taskConfig };

    const executorFn = this.buildExecutorFn(taskId);
    await this.executorService.updateExecutable(taskId, newConfig, executorFn);
    await this.dao.update(taskId, JSON.stringify(newConfig));
    this.logger.info(`updateTask[taskId=${taskId}]: updated`);
  }

  async getTask(taskId: number): Promise<Task | { config: TaskConfigDto }> {
    const task = await this.dao.findByIdThrowable(taskId);
    const configDto: TaskConfigDto = JSON.parse(task.config);
    return { ...task, name: configDto.name, config: configDto };
  }
}
