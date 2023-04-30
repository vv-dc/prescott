import { TaskRun } from '@model/domain/task-run';
import { PgConnection } from '@model/shared/pg-connection';

export class TaskRunDao {
  constructor(private db: PgConnection) {}

  create(taskRun: Omit<TaskRun, 'id'>): Promise<TaskRun> {
    return this.db('task_runs').insert(taskRun);
  }

  findOneById(id: string): Promise<TaskRun | null> {
    return this.db('task_runs').where({ id }).first();
  }

  findAllByTaskId(taskId: number): Promise<TaskRun[]> {
    return this.db('task_runs').select('*').where({ taskId });
  }

  async countByTaskId(taskId: number): Promise<number> {
    const [{ count }] = await this.db('task_runs')
      .where({ taskId })
      .count<{ count: string }[]>('id');
    return parseInt(count, 10);
  }

  async update(
    id: number,
    dto: Omit<TaskRun, 'id' | 'taskId' | 'startedAt'>
  ): Promise<void> {
    await this.db('task_runs').update(dto).where({ id });
  }
}