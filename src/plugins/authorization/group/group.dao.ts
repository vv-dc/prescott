import { PgConnection } from '@model/shared/pg-connection';
import { Group } from '@plugins/authorization/group/model/group';

export class GroupDao {
  constructor(private pg: PgConnection) {}

  async findByName(name: string): Promise<Group | undefined> {
    const group = await this.pg<Group>('groups')
      .select()
      .where({ name })
      .first();
    return group;
  }

  async findById(id: number): Promise<Group | undefined> {
    const group = await this.pg<Group>('groups').select().where({ id }).first();
    return group;
  }

  async checkUserInGroup(groupId: number, userId: number): Promise<boolean> {
    const { present } = await this.pg.first<{ present: boolean }>(
      this.pg.raw(
        'exists ? as present',
        this.pg('user_groups').select('id').where({ groupId, userId }).limit(1)
      )
    );
    return present;
  }

  async addUser(groupId: number, userId: number): Promise<void> {
    await this.pg('user_groups').insert({ groupId, userId });
  }

  async deleteUser(groupId: number, userId: number): Promise<void> {
    await this.pg('user_groups').where({ groupId, userId }).delete();
  }

  async create(name: string, ownerId: number): Promise<number> {
    const [groupId] = await this.pg<Group>('groups')
      .insert({ name, ownerId })
      .returning<number[]>('id');
    return groupId;
  }

  async deleteById(id: number): Promise<void> {
    await this.pg<Group>('groups').where({ id }).delete();
  }
}
