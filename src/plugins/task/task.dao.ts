import { Knex } from 'knex';

import { Task } from '@model/domain/task';
import { EntityNotFound } from '@modules/errors/abstract-errors';

export class TaskDao {
  constructor(private db: Knex) {}

  private mapTask(task: Task): Task {
    return {
      ...task,
      active: Boolean(task.active),
    };
  }

  async findById(id: number): Promise<Task | undefined> {
    const task = await this.db<Task>('tasks').where({ id }).first();
    return task && this.mapTask(task);
  }

  async findByIdThrowable(id: number): Promise<Task> {
    const task = await this.findById(id);
    if (task === undefined) {
      throw new EntityNotFound(`Task not found by id=${id}`);
    }
    return this.mapTask(task);
  }

  async findByName(name: string): Promise<Task | undefined> {
    const task = await this.db<Task>('tasks').where({ name }).first();
    return task && this.mapTask(task);
  }

  async findAllByActive(isActive: boolean): Promise<Task[]> {
    const tasks = await this.db('tasks')
      .select('*')
      .where({ active: isActive })
      .orderBy('id');
    return tasks.map((task) => this.mapTask(task));
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

  async updateEnvKey(id: number, envKey: string): Promise<void> {
    await this.db('tasks').update({ envKey }).where({ id });
  }

  async delete(id: number): Promise<void> {
    await this.db('tasks').delete().where({ id });
  }

  async setActive(id: number, value: boolean): Promise<void> {
    await this.db('tasks').update({ active: value }).where({ id });
  }
}
