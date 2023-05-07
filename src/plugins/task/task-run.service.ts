import { dispatchTask, InMemoryMutex } from '@lib/async.utils';
import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { TaskRun } from '@model/domain/task-run';
import { LogProviderContract } from '@modules/contract/model/log-provider.contract';
import {
  MetricAggregateDto,
  MetricProviderContract,
} from '@modules/contract/model/metric-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import {
  EntryPage,
  EntryPaging,
  EntrySearchDto,
} from '@modules/contract/model/entry-paging';
import { EntityNotFound } from '@modules/errors/abstract-errors';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric-entry';

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

  private async isRunAllowed(
    taskId: number,
    limit?: number
  ): Promise<[boolean, number]> {
    if (limit === undefined) return [true, Infinity];
    const runsCount = await this.dao.countByTaskId(taskId);
    return [runsCount < limit, Math.max(limit - runsCount - 1, 0)];
  }

  async tryToRegister(
    taskId: number,
    limit?: number
  ): Promise<[TaskRunHandle | null, number]> {
    return this.mutex.run(taskId.toString(), async () => {
      const [isRunAllowed, runsLeft] = await this.isRunAllowed(taskId, limit);
      if (!isRunAllowed) {
        return [null, 0];
      }
      const { id: runId } = await this.dao.create({
        taskId,
        status: 'pending',
        createdAt: new Date(),
      });
      const runHandle: TaskRunHandle = { runId, taskId };
      return [runHandle, runsLeft];
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
    const metricGenerator = envHandle.metrics();
    dispatchTask(() =>
      Promise.all([
        this.log.consumeLogGenerator(runHandle, logGenerator),
        this.metric.consumeMetricGenerator(runHandle, metricGenerator),
      ])
    );
  }

  async flushAll(taskId: number): Promise<void> {
    await this.log.flushLog(taskId);
    await this.metric.flushMetric(taskId);
  }

  async searchLogs(
    runHandle: TaskRunHandle,
    dto: EntrySearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<LogEntry>> {
    await this.getOne(runHandle.runId);
    return this.log.searchLog(runHandle, dto, paging);
  }

  async searchMetrics(
    runHandle: TaskRunHandle,
    dto: EntrySearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<MetricEntry>> {
    await this.getOne(runHandle.runId);
    return this.metric.searchMetric(runHandle, dto, paging);
  }

  async aggregateMetrics(
    runHandle: TaskRunHandle,
    dto: MetricAggregateDto
  ): Promise<MetricsAggregated> {
    await this.getOne(runHandle.runId);
    return this.metric.aggregateMetric(runHandle, dto);
  }
}
