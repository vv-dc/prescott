import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('tasks', (table) => {
    table.boolean('active').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('active');
  });
}
