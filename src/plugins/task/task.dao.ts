import { Knex } from 'knex';

import { Task } from '@model/domain/task';

export class TaskDao {
  constructor(private db: Knex) {}

  async findById(id: number): Promise<Task | undefined> {
    return this.db<Task>('tasks').where({ id }).first();
  }

  async findByName(name: string): Promise<Task | undefined> {
    return this.db<Task>('tasks').where({ name }).first();
  }

  async findAll(): Promise<Task[]> {
    return this.db<Task>('tasks').select('*');
  }

  async create(task: Task): Promise<number> {
    const { name, userId, groupId, config, active } = task;
    const [id] = await this.db('tasks')
      .insert({
        name,
        userId,
        groupId,
        config,
        active,
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
