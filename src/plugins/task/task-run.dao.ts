import { TaskRun } from '@model/domain/task-run';
import { DbConnection } from '@model/shared/db-connection';
import { TaskRunStatus } from '@model/domain/task-run-status';
import { parseDate } from '@lib/date.utils';

type UpdateTaskRunDto = Partial<Omit<TaskRun, 'id' | 'taskId' | 'createdAt'>>;

export class TaskRunDao {
  constructor(private db: DbConnection) {}

  private mapTaskRun(taskRun: TaskRun): TaskRun {
    const { createdAt, startedAt, finishedAt, ...rest } = taskRun;
    return {
      ...rest,
      createdAt: parseDate(createdAt),
      startedAt: startedAt ? parseDate(startedAt) : undefined,
      finishedAt: finishedAt ? parseDate(finishedAt) : undefined,
    };
  }

  async create(taskRun: Omit<TaskRun, 'id'>): Promise<TaskRun> {
    const [row] = await this.db('task_runs').insert(taskRun).returning('*');
    return this.mapTaskRun(row);
  }

  async findOneById(id: number): Promise<TaskRun | undefined> {
    const taskRun = await this.db('task_runs').where({ id }).first();
    return taskRun && this.mapTaskRun(taskRun);
  }

  async findAllByTaskId(taskId: number): Promise<TaskRun[]> {
    const taskRuns = await this.db('task_runs')
      .select('*')
      .where({ taskId })
      .orderBy('rank');
    return taskRuns.map((taskRun) => this.mapTaskRun(taskRun));
  }

  async countByTaskId(taskId: number): Promise<number> {
    const [{ count }] = await this.db('task_runs')
      .where({ taskId })
      .count<{ count: string }[]>('id as count');
    return parseInt(count, 10);
  }

  async update(id: number, dto: UpdateTaskRunDto): Promise<void> {
    await this.db('task_runs').update(dto).where({ id });
  }

  async updateAllByTaskIdAndStatus(
    taskId: number,
    status: TaskRunStatus,
    dto: UpdateTaskRunDto
  ): Promise<number> {
    const rows = await this.db('task_runs')
      .update(dto)
      .where({ taskId, status })
      .returning('id');
    return rows.length;
  }

  async findAllByTaskIdAndStatus(
    taskId: number,
    status: TaskRunStatus
  ): Promise<TaskRun[]> {
    const taskRuns = await this.db('task_runs')
      .select('*')
      .where({ taskId, status })
      .orderBy('rank');
    return taskRuns.map((taskRun) => this.mapTaskRun(taskRun));
  }
}
