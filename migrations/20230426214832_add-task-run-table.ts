import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_runs', (table) => {
    table.bigIncrements('id').notNullable().primary();
    table
      .integer('task_id')
      .notNullable()
      .references('tasks.id')
      .onDelete('cascade');
    table.string('handle_id', 255);
    table.string('status', 64).notNullable();
    table.datetime('created_at').notNullable();
    table.datetime('started_at');
    table.datetime('finished_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_runs');
}
