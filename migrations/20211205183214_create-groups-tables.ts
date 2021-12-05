import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('groups', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable().unique();
  });
  await knex.schema.createTable('user_groups', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('users.id')
      .onDelete('cascade');
    table
      .integer('group_id')
      .notNullable()
      .references('groups.id')
      .onDelete('cascade');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_groups');
  await knex.schema.dropTable('groups');
}
