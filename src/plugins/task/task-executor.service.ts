import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/queue/task-queue.contract';
import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { EnvInfo } from '@model/domain/env-info';
import { TaskStep } from '@model/domain/task-step';
import { buildTaskCmd, buildTaskLabel } from '@plugins/task/task.utils';
import {
  EnvHandle,
  StopEnvHandleSignalType,
} from '@modules/contract/model/env/env-handle';
import { LocalTaskConfig } from '@model/domain/local-task-config';
import { dispatchTask } from '@lib/async.utils';
import { getLogger } from '@logger/logger';
import {
  TaskAfterBuildCallbackFn,
  TaskOnRunCallbackFn,
} from '@plugins/task/model/task-callback-fn';
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
    onRunCallbackFn: TaskOnRunCallbackFn,
    afterBuildCallbackFn?: TaskAfterBuildCallbackFn
  ): Promise<void> {
    const isScheduled = await this.scheduler.exists(taskId);
    if (isScheduled) return;

    const { config, envInfo } = taskConfig;
    const label = buildTaskLabel(taskId);

    await this.scheduler.schedule(taskId, {
      callback: async () => {
        const executorFnNullable = await onRunCallbackFn(taskId);
        if (executorFnNullable !== null) {
          await this.enqueueExecutable(taskId, executorFnNullable);
        }
      },
      scheduleConfig: config.local.scheduleConfig,
    });

    // task was already built, no need to it again
    if (!afterBuildCallbackFn) {
      await this.scheduler.start(taskId);
      this.logger.info(`scheduleExecutable[taskId=${taskId}]: scheduled`);
      return;
    }

    // build task, but no need to wait for the end of it as task scheduled to run not immediately
    dispatchTask(async () => {
      const envKey = await this.buildClearTask(
        label,
        envInfo,
        config.appConfig.steps
      );
      this.logger.info(`scheduleExecutable[taskId=${taskId}]: built`);
      await afterBuildCallbackFn(taskId, envKey);

      await this.scheduler.start(taskId);
      this.logger.info(`scheduleExecutable[taskId=${taskId}]: scheduled`);
    });
  }

  async enqueueExecutable(taskId: number, executorFn: ExecuteTaskFn) {
    await this.queue.enqueue(taskId, executorFn);
  }

  private async buildClearTask(
    label: string,
    envInfo: EnvInfo,
    steps: TaskStep[]
  ): Promise<string> {
    return await this.envBuilder.buildEnv({
      label,
      envInfo,
      script: buildTaskCmd(label, steps),
      isCache: false,
    });
  }

  async runExecutable(
    taskId: number,
    envKey: string,
    config: LocalTaskConfig
  ): Promise<EnvHandle> {
    const label = buildTaskLabel(taskId);
    const envHandle = await this.envRunner.runEnv({
      envKey,
      label: label,
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
    const label = buildTaskLabel(taskId);
    await this.scheduler.delete(taskId);
    await this.deleteAllChildren(label, true);
    await this.envBuilder.deleteEnv({ envKey: label, isForce: true });
  }

  async deleteExecutableEnv(taskId: number): Promise<void> {
    const label = buildTaskLabel(taskId);
    await this.envBuilder.deleteEnv({ envKey: label, isForce: false });
  }

  private async deleteAllChildren(label: string, isForce: boolean) {
    await this.callForAllChildren(label, async (envHandle: EnvHandle) => {
      await envHandle.delete({ isForce });
      this.logger.info(`deleteAllChildren[handleId=${envHandle.id()}]: done`);
    });
  }

  async stopExecutable(
    taskId: number,
    stopSignal: StopEnvHandleSignalType
  ): Promise<void> {
    const label = buildTaskLabel(taskId);
    await this.scheduler.stop(taskId);
    await this.stopAllChildren(label, stopSignal);
    this.logger.info(`stopExecutable[taskId=${taskId}]: stop all children`);
  }

  private async stopAllChildren(
    label: string,
    stopSignal: StopEnvHandleSignalType
  ): Promise<void> {
    await this.callForAllChildren(label, async (envHandle: EnvHandle) => {
      await envHandle.stop({ timeout: 5_000, signal: stopSignal });
      this.logger.info(`stopAllChildren[handleId=${envHandle.id()}]: done`);
    });
  }

  private async callForAllChildren(
    label: string,
    callbackFn: (envHandle: EnvHandle) => Promise<void> | void
  ): Promise<void> {
    const handleIds = await this.envRunner.getEnvChildrenHandleIds(label);
    this.logger.info(
      `callForAllChildren[label=${label}]: found ${handleIds.length} children`
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
    onRunCallbackFn: TaskOnRunCallbackFn,
    afterBuildCallbackFn: TaskAfterBuildCallbackFn
  ): Promise<void> {
    await this.deleteExecutable(taskId);
    await this.scheduleExecutable(
      taskId,
      newConfig,
      onRunCallbackFn,
      afterBuildCallbackFn
    );
  }
}
