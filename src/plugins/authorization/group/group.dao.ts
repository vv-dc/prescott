import { PgConnection } from '@model/shared/pg-connection';
import { Group } from '@plugins/authorization/group/model/group';

export class GroupDao {
  constructor(private pg: PgConnection) {}

  async findByName(name: string): Promise<Group | undefined> {
    const group = await this.pg<Group>('groups')
      .select('*')
      .where({ name })
      .first();
    return group;
  }

  async create(name: string, ownerId: number): Promise<number> {
    const [groupId] = await this.pg<Group>('groups')
      .insert({ name, ownerId })
      .returning<number[]>('id');
    return groupId;
  }
}
