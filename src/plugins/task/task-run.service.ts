import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { TaskRun } from '@model/domain/task-run';
import {
  LogProviderContract,
  LogSearchDto,
} from '@modules/contract/model/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { setImmediate } from 'node:timers';
import { LogEntry } from '@modules/contract/model/log-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { EntityNotFound } from '@modules/errors/abstract-errors';

export class TaskRunService {
  constructor(
    private dao: TaskRunDao,
    private log: LogProviderContract,
    private metric: MetricProviderContract
  ) {}

  countAll(taskId: number): Promise<number> {
    return this.dao.countByTaskId(taskId);
  }

  async getOne(runId: number): Promise<TaskRun> {
    const runNullable = await this.dao.findOneById(runId);
    if (runNullable === null) {
      throw new EntityNotFound('TaskRun is not found');
    }
    return runNullable;
  }

  getAll(taskId: number): Promise<TaskRun[]> {
    return this.dao.findAllByTaskId(taskId);
  }

  async start(taskId: number, envHandle: EnvHandle): Promise<TaskRunHandle> {
    const taskRun = await this.dao.create({
      taskId,
      handleId: envHandle.id(),
      startedAt: new Date(),
      status: 'running',
    });
    const runHandle: TaskRunHandle = { taskId, runId: taskRun.id };
    this.registerRunListeners(runHandle, envHandle);
    return runHandle;
  }

  async finish(runHandle: TaskRunHandle, isSuccess: boolean): Promise<void> {
    const { runId } = runHandle;
    await this.dao.update(runId, {
      finishedAt: new Date(),
      status: isSuccess ? 'succeed' : 'failed',
    });
  }

  registerRunListeners(runHandle: TaskRunHandle, envHandle: EnvHandle): void {
    const logGenerator = envHandle.logs();
    setImmediate(() => this.log.consumeLogGenerator(runHandle, logGenerator));

    const metricGenerator = envHandle.metrics();
    setImmediate(async () => {
      for await (const metricEntry of metricGenerator) {
        await this.metric.writeMetric(runHandle, metricEntry);
      }
    });
  }

  async flushAll(taskId: number): Promise<void> {
    await this.log.flushLog(taskId);
    // TODO: flush metric
  }

  async searchLogs(
    runHandle: TaskRunHandle,
    dto: LogSearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<LogEntry>> {
    await this.getOne(runHandle.runId);
    return this.log.searchLog(runHandle, dto, paging);
  }
}
