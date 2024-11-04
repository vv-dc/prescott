import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/queue/task-queue.contract';
import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { EnvInfo } from '@model/domain/env-info';
import { TaskStep } from '@model/domain/task-step';
import { buildTaskLabel, decodeTaskSteps } from '@plugins/task/task.utils';
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
import { BuildEnvResultDto } from '@modules/contract/model/env/env-builder.contract';
import { EnvContractResolver } from '@src/modules/contract/model/contract-config';
import { TaskExecutableHandle } from './model/task-executable-handle';

export class TaskExecutorService {
  private readonly logger = getLogger('task-executor-service');

  constructor(
    private readonly env: EnvContractResolver,
    private readonly scheduler: TaskSchedulerContract,
    private readonly queue: TaskQueueContract
  ) {}

  async scheduleExecutable(
    handle: TaskExecutableHandle,
    taskConfig: TaskConfigDto,
    onRunCallbackFn: TaskOnRunCallbackFn,
    afterBuildCallbackFn?: TaskAfterBuildCallbackFn
  ): Promise<void> {
    const { taskId } = handle;
    const isScheduled = await this.scheduler.exists(taskId);
    if (isScheduled) {
      await this.scheduler.start(taskId);
      this.logger.info(
        `scheduleExecutable[taskId=${taskId}]: already scheduled - start`
      );
      return;
    }

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
      const buildResult = await this.buildClearTask(
        handle,
        label,
        envInfo,
        config.appConfig.steps
      );
      this.logger.info(`scheduleExecutable[taskId=${taskId}]: built`);
      await afterBuildCallbackFn(taskId, buildResult);

      await this.scheduler.start(taskId);
      this.logger.info(`scheduleExecutable[taskId=${taskId}]: scheduled`);
    });
  }

  async enqueueExecutable(taskId: number, executorFn: ExecuteTaskFn) {
    await this.queue.enqueue(taskId, executorFn);
  }

  private buildClearTask(
    handle: TaskExecutableHandle,
    label: string,
    envInfo: EnvInfo,
    steps: TaskStep[]
  ): Promise<BuildEnvResultDto> {
    const envBuilder = this.env.getBuilder(handle.runnerName);
    return envBuilder.buildEnv({
      label,
      envInfo,
      steps: decodeTaskSteps(steps),
    });
  }

  async runExecutable(
    handle: TaskExecutableHandle,
    envKey: string,
    envScript: string | null,
    config: LocalTaskConfig
  ): Promise<EnvHandle> {
    const label = buildTaskLabel(handle.taskId);
    const envHandle = await this.env.getRunner(handle.runnerName).runEnv({
      envKey,
      label,
      script: envScript,
      limitations: config.appConfig?.limitations,
    });
    this.logger.info(
      `runExecutable[taskId=${handle.taskId}]: handleId=${envHandle.id()}`
    );
    return envHandle;
  }

  async unscheduleExecutable(taskId: number): Promise<void> {
    await this.scheduler.stop(taskId);
    this.logger.info(`unscheduleExecutable[taskId=${taskId}]: disabled`);
  }

  async deleteExecutable(handle: TaskExecutableHandle): Promise<void> {
    const { taskId, runnerName } = handle;
    const label = buildTaskLabel(taskId);
    await this.scheduler.delete(taskId);
    await this.deleteAllChildren(handle, label, true);

    const envBuilder = this.env.getBuilder(runnerName);
    await envBuilder.deleteEnv({ envKey: label, isForce: true });
  }

  async deleteExecutableEnv(handle: TaskExecutableHandle): Promise<void> {
    const { taskId, runnerName } = handle;
    const label = buildTaskLabel(taskId);

    const envBuilder = this.env.getBuilder(runnerName);
    await envBuilder.deleteEnv({ envKey: label, isForce: false });
  }

  private async deleteAllChildren(
    handle: TaskExecutableHandle,
    label: string,
    isForce: boolean
  ) {
    await this.callForAllChildren(
      handle,
      label,
      async (envHandle: EnvHandle) => {
        await envHandle.delete({ isForce });
        this.logger.info(`deleteAllChildren[handleId=${envHandle.id()}]: done`);
      }
    );
  }

  async stopExecutable(
    handle: TaskExecutableHandle,
    stopSignal: StopEnvHandleSignalType
  ): Promise<void> {
    const { taskId } = handle;
    const label = buildTaskLabel(taskId);
    await this.scheduler.stop(taskId);
    await this.stopAllChildren(handle, label, stopSignal);
    this.logger.info(`stopExecutable[taskId=${taskId}]: stop all children`);
  }

  private async stopAllChildren(
    handle: TaskExecutableHandle,
    label: string,
    stopSignal: StopEnvHandleSignalType
  ): Promise<void> {
    await this.callForAllChildren(
      handle,
      label,
      async (envHandle: EnvHandle) => {
        await envHandle.stop({ timeout: 5_000, signal: stopSignal });
        this.logger.info(`stopAllChildren[handleId=${envHandle.id()}]: done`);
      }
    );
  }

  private async callForAllChildren(
    handle: TaskExecutableHandle,
    label: string,
    callbackFn: (envHandle: EnvHandle) => Promise<void> | void
  ): Promise<void> {
    const envRunner = this.env.getRunner(handle.runnerName);
    const handleIds = await envRunner.getEnvChildrenHandleIds(label);
    this.logger.info(
      `callForAllChildren[label=${label}]: found ${handleIds.length} children`
    );
    if (handleIds.length === 0) {
      return;
    }

    const promises = handleIds.map(async (handleId) => {
      const envHandle = await envRunner.getEnvHandle(handleId);
      await callbackFn(envHandle);
    });
    await Promise.allSettled(promises);
  }

  async updateExecutable(
    handle: TaskExecutableHandle,
    newConfig: TaskConfigDto,
    onRunCallbackFn: TaskOnRunCallbackFn,
    afterBuildCallbackFn: TaskAfterBuildCallbackFn
  ): Promise<void> {
    await this.deleteExecutable(handle);
    await this.scheduleExecutable(
      handle,
      newConfig,
      onRunCallbackFn,
      afterBuildCallbackFn
    );
  }

  checkEnvRunnerIsValid(runnerName: string): string | null {
    if (!this.env.checkRunnerExists(runnerName)) {
      return `EnvRunner[name=${runnerName}] does not exist`;
    }
    return null;
  }
}
