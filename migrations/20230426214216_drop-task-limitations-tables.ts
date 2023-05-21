import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_limitations');
  await knex.schema.dropTable('limitations');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('limitations', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable().unique();
  });
  await knex.schema.createTable('task_limitations', (table) => {
    table
      .integer('task_id')
      .notNullable()
      .references('tasks.id')
      .onDelete('cascade');
    table
      .integer('limitation_id')
      .notNullable()
      .references('limitations.id')
      .onDelete('cascade');
    table.float('value').notNullable();
  });
}
