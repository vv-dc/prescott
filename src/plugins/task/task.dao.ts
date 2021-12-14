import { Knex } from 'knex';
import { Task } from '@model/domain/task';

export class TaskDao {
  constructor(private db: Knex) {}

  async findById(id: number): Promise<Task> {
    return this.db('tasks').first<Task>().where({ id });
  }

  async findAll(): Promise<Task[]> {
    return this.db<Task>('tasks').select('*');
  }

  async create(task: Task): Promise<number> {
    const { name, userId, groupId, config } = task;
    const [id] = await this.db('tasks')
      .insert({
        name,
        userId,
        groupId,
        config,
      })
      .returning('id');
    return id;
  }

  async update(id: number, config: string): Promise<void> {
    await this.db('tasks').update({ config }).where({ id });
  }

  async delete(id: number): Promise<void> {
    await this.db('tasks').delete().where({ id });
  }

  async setActive(id: number, value: boolean): Promise<void> {
    await this.db('tasks').update({ active: value }).where({ id });
  }
}
