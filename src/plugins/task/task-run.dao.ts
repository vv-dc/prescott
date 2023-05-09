import { TaskRun } from '@model/domain/task-run';
import { PgConnection } from '@model/shared/pg-connection';
import { TaskRunStatus } from '@model/domain/task-run-status';

type UpdateTaskRunDto = Partial<Omit<TaskRun, 'id' | 'taskId' | 'createdAt'>>;

export class TaskRunDao {
  constructor(private db: PgConnection) {}

  async create(taskRun: Omit<TaskRun, 'id'>): Promise<TaskRun> {
    const [row] = await this.db('task_runs').insert(taskRun).returning('*');
    return row;
  }

  findOneById(id: number): Promise<TaskRun | undefined> {
    return this.db('task_runs').where({ id }).first();
  }

  findAllByTaskId(taskId: number): Promise<TaskRun[]> {
    return this.db('task_runs').select('*').where({ taskId }).orderBy('rank');
  }

  async countByTaskId(taskId: number): Promise<number> {
    const [{ count }] = await this.db('task_runs')
      .where({ taskId })
      .count<{ count: string }[]>('id');
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

  findAllByTaskIdAndStatus(
    taskId: number,
    status: TaskRunStatus
  ): Promise<TaskRun[]> {
    return this.db('task_runs')
      .select('*')
      .where({ taskId, status })
      .orderBy('rank');
  }
}
