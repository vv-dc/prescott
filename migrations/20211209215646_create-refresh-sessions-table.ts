import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    'refresh_sessions',
    (table: Knex.TableBuilder) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .notNullable()
        .references('users.id')
        .onDelete('cascade');
      table.uuid('refresh_token').notNullable().unique();
      table.string('ip', 15).notNullable();
      table.bigInteger('expires_in').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['user_id', 'ip']);
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('refresh_sessions');
}
