import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('tasks', (table) => {
    table.string('env_key', 4096).nullable(); // docker images can have pretty long names
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('env_key');
  });
}
