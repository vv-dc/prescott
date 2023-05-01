import { setImmediate } from 'node:timers';
import { InMemoryMutex } from '@lib/async.utils';
import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { TaskRun } from '@model/domain/task-run';
import {
  LogProviderContract,
  LogSearchDto,
} from '@modules/contract/model/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { EntityNotFound } from '@modules/errors/abstract-errors';

export class TaskRunService {
  private mutex = new InMemoryMutex(1_000, 5);

  constructor(
    private dao: TaskRunDao,
    private log: LogProviderContract,
    private metric: MetricProviderContract
  ) {}

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

  private async isRunAllowed(taskId: number, limit?: number) {
    if (limit === undefined) return true;
    const runsCount = await this.dao.countByTaskId(taskId);
    return runsCount < limit;
  }

  async tryToRegisterRun(
    taskId: number,
    limit?: number
  ): Promise<TaskRunHandle | null> {
    return this.mutex.run(taskId.toString(), async () => {
      if (!(await this.isRunAllowed(taskId, limit))) {
        return null;
      }
      const { id: runId } = await this.dao.create({
        taskId,
        status: 'pending',
        createdAt: new Date(),
      });
      return { runId, taskId };
    });
  }

  async start(runHandle: TaskRunHandle, envHandle: EnvHandle): Promise<void> {
    const { runId } = runHandle;
    await this.dao.update(runId, {
      status: 'running',
      handleId: envHandle.id(),
      startedAt: new Date(),
    });
    this.registerRunListeners(runHandle, envHandle);
  }

  async finish(runHandle: TaskRunHandle, isSuccess: boolean): Promise<void> {
    const { runId } = runHandle;
    await this.dao.update(runId, {
      status: isSuccess ? 'succeed' : 'failed',
      finishedAt: new Date(),
    });
  }

  registerRunListeners(runHandle: TaskRunHandle, envHandle: EnvHandle): void {
    const logGenerator = envHandle.logs();
    setImmediate(() => this.log.consumeLogGenerator(runHandle, logGenerator));

    const metricGenerator = envHandle.metrics();
    setImmediate(() =>
      this.metric.consumeMetricGenerator(runHandle, metricGenerator)
    );
  }

  async flushAll(taskId: number): Promise<void> {
    await this.log.flushLog(taskId);
    await this.metric.flushMetric(taskId);
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
