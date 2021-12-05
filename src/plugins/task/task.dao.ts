import { Knex } from 'knex';

export class TaskDao {
  constructor(private db: Knex) {}
}
