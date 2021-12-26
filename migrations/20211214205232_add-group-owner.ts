import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('groups', (table: Knex.TableBuilder) => {
    table
      .integer('owner_id')
      .notNullable()
      .references('users.id')
      .onDelete('cascade');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('groups', (table: Knex.TableBuilder) => {
    table.dropColumn('owner_id');
  });
}
