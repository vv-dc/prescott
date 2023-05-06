import { TaskDao } from '@plugins/task/task.dao';
import {
  buildTaskCmd,
  buildTaskIdentifier,
  buildTaskUniqueName,
} from '@plugins/task/task.utils';
import {
  EntityConflict,
  EntityNotFound,
} from '@modules/errors/abstract-errors';
import { cronEveryNMinutes } from '@lib/cron.utils';
import {
  TaskConfigDto,
  LocalTaskConfig,
  RepositoryTaskConfig,
} from '@model/dto/task-config.dto';
import { Task } from '@model/domain/task';
import { TaskStep } from '@model/domain/task-step';
import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import { TaskRunService } from '@plugins/task/task-run.service';
import { EnvInfo } from '@model/domain/env-info';
import {
  ScheduleTaskDto,
  TaskSchedulerContract,
} from '@modules/contract/model/task-scheduler.contract';
import {
  EnqueueTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/task-queue.contract';

// TODO: move task execution to separate service
export class TaskService {
  constructor(
    private dao: TaskDao,
    private runService: TaskRunService,
    private scheduler: TaskSchedulerContract,
    private queue: TaskQueueContract,
    private envProvider: EnvProviderContract
  ) {}

  private async runTask(
    identifier: string,
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    try {
      await this.runTaskImpl(identifier, taskId, taskConfig);
    } catch (err) {
      // TODO: error handling
      await this.stopTask(taskId);
    }
  }

  // task is like a clean function, so there is no need to re-build it
  private async runTaskImpl(
    identifier: string,
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { times, config } = taskConfig;

    const [runHandle, runsLeft] = await this.runService.tryToRegister(
      taskId,
      times
    );
    if (runHandle === null) {
      // TODO: error handling
      return;
    }

    const envHandle = await this.envProvider.runEnv({
      envId: identifier,
      limitations: config.appConfig?.limitations,
      options: { isDelete: false },
    });

    await this.runService.start(runHandle, envHandle);
    const exitCode: number = await envHandle.wait();
    await this.runService.finish(runHandle, exitCode === 0);

    await envHandle.delete({ isForce: false });
    if (runsLeft === 0) {
      await this.envProvider.deleteEnv({ envId: identifier, isForce: false });
      await this.stopTask(taskId);
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async runWatch(
    identifier: string,
    taskId: number,
    config: TaskConfigDto
  ): Promise<void> {
    // TODO: try to clone, build and then run
  }
  // eslint-enable @typescript-eslint/no-unused-vars

  private async register(
    identifier: string,
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { config } = taskConfig;

    const external = 'repository' in config;
    const runner = external ? 'runWatch' : 'runTask';
    const executorFn = () => this[runner](identifier, taskId, taskConfig);

    const scheduleConfig: ScheduleTaskDto = {
      callback: () => this.queue.enqueue(taskId, executorFn),
      configString: external ? cronEveryNMinutes(5) : config.local.cronString,
    };
    await this.scheduler.schedule(taskId, scheduleConfig);
  }

  async registerFromDatabase(): Promise<void> {
    const tasks = await this.dao.findAll();
    for (const task of tasks) {
      const { id, config, active } = task as Required<Task>;
      if (active) {
        const taskConfig: TaskConfigDto = JSON.parse(config);
        const identifier = buildTaskIdentifier(id);
        await this.register(identifier, id, taskConfig);
      }
    }
  }

  // we do not want to make user wait until build,
  // so we just create task, but start it only after build
  private async buildClearTask(
    taskId: number,
    identifier: string,
    envInfo: EnvInfo,
    steps: TaskStep[]
  ): Promise<void> {
    await this.envProvider.compileEnv({
      alias: identifier,
      envInfo,
      script: buildTaskCmd(identifier, steps),
      isCache: false,
    });
    await this.scheduler.start(taskId);
  }

  async createTask(
    groupId: number,
    userId: number,
    taskConfig: TaskConfigDto
  ): Promise<number> {
    const { name, envInfo, config } = taskConfig;
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

    const identifier = buildTaskIdentifier(taskId);
    await this.register(identifier, taskId, taskConfig); // cron job created, but not started
    const clearTask = !('repository' in config);

    if (clearTask) {
      const { steps } = config.appConfig;
      // TODO: do it asynchronously
      await this.buildClearTask(taskId, identifier, envInfo, steps);
    }

    return taskId;
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.scheduler.delete(taskId);
    await this.assertTaskExists(taskId);

    const identifier = buildTaskIdentifier(taskId);
    await this.deleteAllEnvs(identifier);

    await this.envProvider.deleteEnv({ envId: identifier, isForce: true });
    await this.dao.delete(taskId);
    await this.runService.flushAll(taskId);
  }

  private async deleteAllEnvs(identifier: string): Promise<void> {
    const handleIds = await this.envProvider.getEnvChildren(identifier);
    for (const handleId of handleIds) {
      const envHandle = await this.envProvider.getEnvHandle(handleId);
      await envHandle.delete({ isForce: true });
    }
  }

  private async stopAllEnvs(identifier: string): Promise<void> {
    const handleIds = await this.envProvider.getEnvChildren(identifier);
    for (const handleId of handleIds) {
      const envHandle = await this.envProvider.getEnvHandle(handleId);
      await envHandle.stop({}).catch(() => {});
    }
  }

  async stopTask(taskId: number): Promise<void> {
    await this.assertTaskExists(taskId);

    const identifier = buildTaskIdentifier(taskId);
    await this.scheduler.stop(taskId);
    await this.stopAllEnvs(identifier);

    await this.dao.setActive(taskId, false);
  }

  private async assertTaskExists(taskId: number): Promise<void> {
    const task = await this.dao.findById(taskId);
    if (task === undefined) {
      throw new EntityNotFound('Task does not exist');
    }
  }

  async startTask(taskId: number): Promise<void> {
    await this.assertTaskExists(taskId);

    await this.dao.setActive(taskId, true);
    if (!(await this.scheduler.exists(taskId))) {
      const { config } = (await this.dao.findById(taskId)) as Task;
      const identifier = buildTaskIdentifier(taskId);
      await this.register(identifier, taskId, JSON.parse(config));
    }
    await this.scheduler.start(taskId);
  }

  async updateTask(
    groupId: number,
    taskId: number,
    taskConfig: LocalTaskConfig | RepositoryTaskConfig
  ): Promise<void> {
    await this.assertTaskExists(taskId);

    const identifier = buildTaskIdentifier(taskId);
    await this.scheduler.delete(taskId);
    await this.deleteAllEnvs(identifier);

    const task = (await this.dao.findById(taskId)) as Task;
    const oldTaskConfig = JSON.parse(task.config);
    const newTaskConfig = { ...oldTaskConfig, config: taskConfig };

    await this.dao.update(taskId, JSON.stringify(newTaskConfig));
    await this.register(identifier, taskId, newTaskConfig);
  }

  async getTask(taskId: number): Promise<Task | { config: TaskConfigDto }> {
    const task = await this.dao.findById(taskId);
    if (task == undefined) {
      throw new EntityNotFound('Task does not exist');
    }
    const configDto: TaskConfigDto = JSON.parse(task.config);
    return { ...task, name: configDto.name, config: configDto };
  }
}
