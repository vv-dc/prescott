import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import { TaskQueueContract } from '@modules/contract/model/task-queue.contract';
import { TaskSchedulerContract } from '@modules/contract/model/task-scheduler.contract';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { EnvInfo } from '@model/domain/env-info';
import { TaskStep } from '@model/domain/task-step';
import { buildTaskCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { LocalTaskConfig } from '@model/domain/local-task-config';
import { dispatchTask } from '@lib/async.utils';
import { getLogger } from '@logger/logger';
import { TaskCallbackFn } from '@plugins/task/model/task-callback-fn';

export class TaskExecutorService {
  private readonly logger = getLogger('task-executor-service');

  constructor(
    private readonly env: EnvProviderContract,
    private readonly scheduler: TaskSchedulerContract,
    private readonly queue: TaskQueueContract
  ) {}

  async registerExecutable(
    taskId: number,
    taskConfig: TaskConfigDto,
    callbackFn: TaskCallbackFn
  ): Promise<void> {
    const isScheduled = await this.scheduler.exists(taskId);
    if (isScheduled) return;

    const { config, envInfo } = taskConfig;
    const identifier = buildTaskIdentifier(taskId);

    await this.scheduler.schedule(taskId, {
      callback: async () => {
        const executorFnNullable = await callbackFn(taskId);
        if (executorFnNullable !== null) {
          await this.queue.enqueue(taskId, executorFnNullable);
        }
      },
      scheduleConfig: config.local.scheduleConfig,
    });

    // no need to wait for the end of build as task scheduled to run not immediately
    dispatchTask(async () => {
      await this.buildClearTask(identifier, envInfo, config.appConfig.steps);
      await this.scheduler.start(taskId);
      this.logger.info(`registerExecutable[taskId=${taskId}]: scheduled`);
    });
  }

  private async buildClearTask(
    identifier: string,
    envInfo: EnvInfo,
    steps: TaskStep[]
  ): Promise<void> {
    // TODO: add logging and error handling for builds
    await this.env.compileEnv({
      alias: identifier,
      envInfo,
      script: buildTaskCmd(identifier, steps),
      isCache: false,
    });
  }

  async runExecutable(
    taskId: number,
    config: LocalTaskConfig
  ): Promise<EnvHandle> {
    const identifier = buildTaskIdentifier(taskId);
    const envHandle = await this.env.runEnv({
      envId: identifier,
      limitations: config.appConfig?.limitations,
      options: { isDelete: false },
    });
    this.logger.info(
      `runExecutable[taskId=${taskId}]: handleId=${envHandle.id()}`
    );
    return envHandle;
  }

  async unscheduleExecutable(taskId: number): Promise<void> {
    await this.scheduler.stop(taskId);
    this.logger.info(`unscheduleExecutable[taskId=${taskId}]: disabled`);
  }

  async deleteExecutableEnv(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    await this.env.deleteEnv({ envId: identifier, isForce: false });
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
    callbackFn: TaskCallbackFn
  ): Promise<void> {
    await this.deleteExecutable(taskId);
    await this.registerExecutable(taskId, newConfig, callbackFn);
  }
}
