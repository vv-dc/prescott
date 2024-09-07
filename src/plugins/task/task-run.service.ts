import { getLogger } from '@logger/logger';
import { dispatchTask, InMemoryMutex } from '@lib/async.utils';
import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { TaskRun } from '@model/domain/task-run';
import { LogProviderContract } from '@modules/contract/model/log-provider.contract';
import {
  MetricAggregateDto,
  MetricProviderContract,
} from '@modules/contract/model/metric-provider.contract';
import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import {
  EntryPage,
  EntryPaging,
  EntrySearchDto,
} from '@modules/contract/model/entry-paging';
import { BadRequest, EntityNotFound } from '@modules/errors/abstract-errors';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric-entry';
import { TaskRunStatus } from '@model/domain/task-run-status';

export class TaskRunService {
  private logger = getLogger('task-run-service');
  private mutex = new InMemoryMutex(1_000, 5);

  constructor(
    private dao: TaskRunDao,
    private log: LogProviderContract,
    private metric: MetricProviderContract
  ) {}

  async getOneThrowable(runId: number): Promise<TaskRun> {
    const runNullable = await this.dao.findOneById(runId);
    if (runNullable === undefined) {
      this.logger.warn(`getOneThrowable[runId=${runId}]: not found`);
      throw new EntityNotFound(`TaskRun is not found: runId=${runId}`);
    }
    return runNullable;
  }

  async getOneThrowableByTaskId(
    taskId: number,
    runId: number
  ): Promise<TaskRun> {
    const taskRun = await this.getOneThrowable(runId);
    if (taskRun.taskId !== taskId) {
      this.logger.warn(
        `getOneThrowableByTaskId[runId=${runId}]: does not belong to taskId=${taskId}`
      );
      throw new BadRequest(
        `TaskRun[id=${runId}] does not belong to taskId=${taskId}`
      );
    }
    return taskRun;
  }

  getAll(taskId: number): Promise<TaskRun[]> {
    return this.dao.findAllByTaskId(taskId);
  }

  getAllByStatus(taskId: number, status: TaskRunStatus): Promise<TaskRun[]> {
    return this.dao.findAllByTaskIdAndStatus(taskId, status);
  }

  private async isRunAllowed(
    taskId: number,
    limit?: number
  ): Promise<[boolean, number]> {
    if (limit === undefined) return [true, Infinity];
    const runsCount = await this.dao.countByTaskId(taskId);
    return [runsCount < limit, runsCount];
  }

  async tryToRegister(taskId: number, limit?: number): Promise<TaskRun | null> {
    return this.mutex.run(taskId.toString(), async () => {
      const [isRunAllowed, runsCount] = await this.isRunAllowed(taskId, limit);
      if (!isRunAllowed) {
        this.logger.warn(`tryToRegister[taskId=${taskId}]: run is not allowed`);
        return null;
      }
      const runRank = runsCount + 1;
      const taskRun = await this.dao.create({
        taskId,
        rank: runRank,
        status: 'pending',
        createdAt: new Date(),
      });
      this.logger.info(
        `tryToRegister[taskId=${taskId}]: runId=${taskRun.id}, runRank=${runRank}`
      );
      return taskRun;
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
    this.logger.info(`start[runId=${runId}]: handleId=${envHandle.id()}`);
  }

  async finish(runHandle: TaskRunHandle, isSuccess: boolean): Promise<void> {
    const { runId } = runHandle;
    await this.dao.update(runId, {
      status: isSuccess ? 'succeed' : 'failed',
      finishedAt: new Date(),
    });
    this.logger.info(`finish[runId=${runId}]: success=${isSuccess}`);
  }

  async stopAll(taskId: number): Promise<void> {
    const count = await this.dao.updateAllByTaskIdAndStatus(taskId, 'pending', {
      status: 'stopped',
      finishedAt: new Date(),
    });
    this.logger.info(`stopAll[taskId=${taskId}]: done for ${count} runs`);
  }

  registerRunListeners(runHandle: TaskRunHandle, envHandle: EnvHandle): void {
    const logGenerator = envHandle.logs();
    // TODO: if not metrics - stop
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
    taskId: number,
    runId: number,
    dto: EntrySearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<LogEntry>> {
    const taskRun = await this.getOneThrowableByTaskId(taskId, runId);
    const runHandle: TaskRunHandle = { taskId, runId, runRank: taskRun.rank };
    return this.log.searchLog(runHandle, dto, paging);
  }

  async searchMetrics(
    taskId: number,
    runId: number,
    dto: EntrySearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<MetricEntry>> {
    const taskRun = await this.getOneThrowableByTaskId(taskId, runId);
    const runHandle: TaskRunHandle = { taskId, runId, runRank: taskRun.rank };
    return this.metric.searchMetric(runHandle, dto, paging);
  }

  async aggregateMetrics(
    taskId: number,
    runId: number,
    dto: MetricAggregateDto
  ): Promise<MetricsAggregated> {
    const taskRun = await this.getOneThrowableByTaskId(taskId, runId);
    const runHandle: TaskRunHandle = { taskId, runId, runRank: taskRun.rank };
    return this.metric.aggregateMetric(runHandle, dto);
  }
}
