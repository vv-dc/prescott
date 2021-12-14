import { PgConnection } from '@model/shared/pg-connection';

export class RoleDao {
  constructor(private pg: PgConnection) {}
}
