import { Knex } from 'knex';

import { Task } from '@model/domain/task';
import { EntityNotFound } from '@modules/errors/abstract-errors';

export class TaskDao {
  constructor(private db: Knex) {}

  async findById(id: number): Promise<Task | undefined> {
    return this.db<Task>('tasks').where({ id }).first();
  }

  async findByIdThrowable(id: number): Promise<Task> {
    const task = await this.findById(id);
    if (task === undefined) {
      throw new EntityNotFound(`Task not found by id=${id}`);
    }
    return task;
  }

  async findByName(name: string): Promise<Task | undefined> {
    return this.db<Task>('tasks').where({ name }).first();
  }

  async findAll(): Promise<Task[]> {
    return this.db<Task>('tasks').select('*').orderBy('id');
  }

  async findAllByActive(isActive: boolean): Promise<Task[]> {
    return this.db('tasks')
      .select('*')
      .where({ active: isActive })
      .orderBy('id');
  }

  async create(task: Omit<Task, 'id'>): Promise<number> {
    const { name, userId, groupId, config, active } = task;
    const [{ id }] = await this.db('tasks')
      .insert({
        name,
        userId,
        groupId,
        config,
        active,
      })
      .returning<{ id: number }[]>('id');
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
