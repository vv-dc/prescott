import { TaskDao } from '@plugins/task/task.dao';
import { buildTaskUniqueName } from '@plugins/task/task.utils';
import { EntityConflict } from '@modules/errors/abstract-errors';
import {
  TaskConfigDto,
  LocalTaskConfig,
  RepositoryTaskConfig,
} from '@model/dto/task-config.dto';
import { Task } from '@model/domain/task';
import { TaskExecutorService } from '@plugins/task/task-executor.service';
import { TaskRunService } from '@plugins/task/task-run.service';
import { EnqueueTaskFn } from '@modules/contract/model/task-queue.contract';

export class TaskService {
  constructor(
    private dao: TaskDao,
    private executorService: TaskExecutorService,
    private runService: TaskRunService
  ) {}

  async registerFromDatabase(): Promise<void> {
    const tasks = await this.dao.findAll();
    for (const task of tasks) {
      const { id, config, active } = task;
      if (active) {
        const taskConfig: TaskConfigDto = JSON.parse(config);
        await this.register(id, taskConfig);
      }
    }
  }

  async register(taskId: number, taskConfig: TaskConfigDto): Promise<void> {
    const executorFn: EnqueueTaskFn = this.buildExecutorFn(taskId);
    await this.executorService.registerExecutable(
      taskId,
      taskConfig,
      executorFn
    );
  }

  private buildExecutorFn(taskId: number): EnqueueTaskFn {
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
      return;
    }

    const envHandle = await this.executorService.runExecutable(taskId, config);
    await this.runService.start(runHandle, envHandle);
    const exitCode: number = await envHandle.wait();
    await this.runService.finish(runHandle, exitCode === 0);

    await envHandle.delete({ isForce: false });
    if (runsLeft === 0) {
      await this.stopTask(taskId);
      await this.executorService.deleteExecutable(taskId);
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
      throw new EntityConflict('Task with passed name already exists');
    }

    const taskId = await this.dao.create({
      userId,
      groupId,
      name: buildTaskUniqueName(groupId, name),
      active: true,
      config: JSON.stringify(taskConfig),
    });

    await this.register(taskId, taskConfig);
    return taskId;
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.dao.findByIdThrowable(taskId);
    await this.executorService.deleteExecutable(taskId);
    await this.runService.flushAll(taskId);
    await this.dao.delete(taskId);
  }

  async stopTask(taskId: number): Promise<void> {
    await this.dao.findByIdThrowable(taskId);
    await this.executorService.stopExecutable(taskId);
    await this.dao.setActive(taskId, false);
  }

  async startTask(taskId: number): Promise<void> {
    const task = await this.dao.findByIdThrowable(taskId);
    if (task.active) {
      throw new EntityConflict(`Task is already active: id=${taskId}`);
    }
    const taskConfig = JSON.parse(task.config);
    await this.register(taskId, taskConfig);
    await this.dao.setActive(taskId, true);
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
  }

  async getTask(taskId: number): Promise<Task | { config: TaskConfigDto }> {
    const task = await this.dao.findByIdThrowable(taskId);
    const configDto: TaskConfigDto = JSON.parse(task.config);
    return { ...task, name: configDto.name, config: configDto };
  }
}
