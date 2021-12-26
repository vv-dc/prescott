import { Group } from '@plugins/authorization/group/model/group';
import { UserGroup } from '@plugins/authorization/group/model/user-group';
import { PgConnection } from '@model/shared/pg-connection';

export class GroupDao {
  constructor(private pg: PgConnection) {}

  async findByName(name: string): Promise<Group | undefined> {
    return this.pg<Group>('groups').where({ name }).first();
  }

  async findById(id: number): Promise<Group | undefined> {
    return this.pg<Group>('groups').where({ id }).first();
  }

  async findUserGroup(
    groupId: number,
    userId: number
  ): Promise<UserGroup | undefined> {
    return this.pg<UserGroup>('user_groups').where({ groupId, userId }).first();
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
