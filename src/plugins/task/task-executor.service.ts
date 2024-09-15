import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/queue/task-queue.contract';
import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { EnvInfo } from '@model/domain/env-info';
import { TaskStep } from '@model/domain/task-step';
import { buildTaskCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import {
  EnvHandle,
  StopEnvHandleSignalType,
} from '@modules/contract/model/env/env-handle';
import { LocalTaskConfig } from '@model/domain/local-task-config';
import { dispatchTask } from '@lib/async.utils';
import { getLogger } from '@logger/logger';
import { TaskCallbackFn } from '@plugins/task/model/task-callback-fn';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';

export class TaskExecutorService {
  private readonly logger = getLogger('task-executor-service');

  // TODO: pass builder + runner together?
  constructor(
    private readonly envBuilder: EnvBuilderContract,
    private readonly envRunner: EnvRunnerContract,
    private readonly scheduler: TaskSchedulerContract,
    private readonly queue: TaskQueueContract
  ) {}

  async scheduleExecutable(
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
          await this.enqueueExecutable(taskId, executorFnNullable);
        }
      },
      scheduleConfig: config.local.scheduleConfig,
    });

    // no need to wait for the end of build as task scheduled to run not immediately
    dispatchTask(async () => {
      await this.buildClearTask(identifier, envInfo, config.appConfig.steps);
      await this.scheduler.start(taskId);
      this.logger.info(`scheduleExecutable[taskId=${taskId}]: scheduled`);
    });
  }

  async enqueueExecutable(taskId: number, executorFn: ExecuteTaskFn) {
    await this.queue.enqueue(taskId, executorFn);
  }

  private async buildClearTask(
    identifier: string,
    envInfo: EnvInfo,
    steps: TaskStep[]
  ): Promise<void> {
    await this.envBuilder.buildEnv({
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
    const envHandle = await this.envRunner.runEnv({
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

  async deleteExecutable(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    await this.scheduler.delete(taskId);
    await this.deleteAllChildren(identifier, true);
    await this.envBuilder.deleteEnv({ envId: identifier, isForce: true });
  }

  async deleteExecutableEnv(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    await this.envBuilder.deleteEnv({ envId: identifier, isForce: false });
  }

  private async deleteAllChildren(envId: string, isForce: boolean) {
    await this.callForAllChildren(envId, async (envHandle: EnvHandle) => {
      await envHandle.delete({ isForce });
      this.logger.info(`deleteAllChildren[handleId=${envHandle.id()}]: done`);
    });
  }

  async stopExecutable(
    taskId: number,
    stopSignal: StopEnvHandleSignalType
  ): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    await this.scheduler.stop(taskId);
    await this.stopAllChildren(identifier, stopSignal);
    this.logger.info(`stopExecutable[taskId=${taskId}]: stop all children`);
  }

  private async stopAllChildren(
    envId: string,
    stopSignal: StopEnvHandleSignalType
  ): Promise<void> {
    await this.callForAllChildren(envId, async (envHandle: EnvHandle) => {
      await envHandle.stop({ timeout: 5_000, signal: stopSignal });
      this.logger.info(`stopAllChildren[handleId=${envHandle.id()}]: done`);
    });
  }

  private async callForAllChildren(
    envId: string,
    callbackFn: (envHandle: EnvHandle) => Promise<void> | void
  ): Promise<void> {
    const handleIds = await this.envRunner.getEnvChildrenHandleIds(envId);
    this.logger.info(
      `callForAllChildren[envId=${envId}]: found ${handleIds.length} children`
    );
    if (handleIds.length === 0) {
      return;
    }

    const promises = handleIds.map(async (handleId) => {
      const envHandle = await this.envRunner.getEnvHandle(handleId);
      await callbackFn(envHandle);
    });
    await Promise.allSettled(promises);
  }

  async updateExecutable(
    taskId: number,
    newConfig: TaskConfigDto,
    callbackFn: TaskCallbackFn
  ): Promise<void> {
    await this.deleteExecutable(taskId);
    await this.scheduleExecutable(taskId, newConfig, callbackFn);
  }
}
