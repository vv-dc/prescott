import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('task_runs', (table) => {
    table.integer('rank').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('task_runs', (table) => {
    table.dropColumn('rank');
  });
}
