import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('tasks', (table) => {
    table.text('env_script').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('env_script');
  });
}
