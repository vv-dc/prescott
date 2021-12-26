import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable().unique();
  });
  await knex.schema.createTable('user_roles', (table) => {
    table
      .integer('user_group_id')
      .notNullable()
      .references('user_groups.id')
      .onDelete('cascade');
    table
      .integer('role_id')
      .notNullable()
      .references('roles.id')
      .onDelete('cascade');
  });
  await knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable().unique();
  });
  await knex.schema.createTable('role_permissions', (table) => {
    table
      .integer('role_id')
      .notNullable()
      .references('roles.id')
      .onDelete('cascade');
    table
      .integer('permission_id')
      .notNullable()
      .references('permissions.id')
      .onDelete('cascade');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('role_permissions');
  await knex.schema.dropTable('user_roles');
  await knex.schema.dropTable('roles');
  await knex.schema.dropTable('permissions');
}
