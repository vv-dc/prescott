import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/task-queue.contract';
import { TaskSchedulerContract } from '@modules/contract/model/task-scheduler.contract';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { cronEveryNMinutes } from '@lib/cron.utils';
import { EnvInfo } from '@model/domain/env-info';
import { TaskStep } from '@model/domain/task-step';
import { buildTaskCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { LocalTaskConfig } from '@model/domain/local-task-config';
import { RepositoryTaskConfig } from '@model/domain/repository-task-config';
import { dispatchTask } from '@lib/async.utils';

export class TaskExecutorService {
  constructor(
    private readonly env: EnvProviderContract,
    private readonly scheduler: TaskSchedulerContract,
    private readonly queue: TaskQueueContract
  ) {}

  async registerExecutable(
    taskId: number,
    taskConfig: TaskConfigDto,
    executorFn: ExecuteTaskFn
  ): Promise<void> {
    const isScheduled = await this.scheduler.exists(taskId);
    if (isScheduled) return;

    const { config, envInfo } = taskConfig;
    const identifier = buildTaskIdentifier(taskId);

    const isExternal = 'repository' in config;
    await this.scheduler.schedule(taskId, {
      callback: () => this.queue.enqueue(taskId, executorFn),
      configString: isExternal ? cronEveryNMinutes(5) : config.local.cronString,
    });

    // no need to wait for the end of build as task scheduled to run not immediately
    dispatchTask(async () => {
      if (!isExternal) {
        await this.buildClearTask(identifier, envInfo, config.appConfig.steps);
      }
      await this.scheduler.start(taskId);
    });
  }

  private async buildClearTask(
    identifier: string,
    envInfo: EnvInfo,
    steps: TaskStep[]
  ): Promise<void> {
    await this.env.compileEnv({
      alias: identifier,
      envInfo,
      script: buildTaskCmd(identifier, steps),
      isCache: false,
    });
  }

  async runExecutable(
    taskId: number,
    config: LocalTaskConfig | RepositoryTaskConfig
  ): Promise<EnvHandle> {
    const identifier = buildTaskIdentifier(taskId);
    return this.env.runEnv({
      envId: identifier,
      limitations: config.appConfig?.limitations,
      options: { isDelete: false },
    });
  }

  async deleteExecutable(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    await this.scheduler.delete(taskId);
    await this.deleteAllChildren(identifier);
    await this.env.deleteEnv({ envId: identifier, isForce: true });
  }

  private async deleteAllChildren(envId: string): Promise<void> {
    const handleIds = await this.env.getEnvChildren(envId);
    for (const handleId of handleIds) {
      const envHandle = await this.env.getEnvHandle(handleId);
      await envHandle.delete({ isForce: true });
    }
  }

  async stopExecutable(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    await this.scheduler.stop(taskId);
    await this.stopAllChildren(identifier);
  }

  private async stopAllChildren(envId: string): Promise<void> {
    const handleIds = await this.env.getEnvChildren(envId);
    for (const handleId of handleIds) {
      const envHandle = await this.env.getEnvHandle(handleId);
      await envHandle.stop({});
    }
  }

  async updateExecutable(
    taskId: number,
    newConfig: TaskConfigDto,
    executorFn: ExecuteTaskFn
  ): Promise<void> {
    await this.deleteExecutable(taskId);
    await this.registerExecutable(taskId, newConfig, executorFn);
  }
}
