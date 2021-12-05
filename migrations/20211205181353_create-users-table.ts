import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('login', 120).notNullable().unique();
    table.string('full_name', 120).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password', 120).notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
