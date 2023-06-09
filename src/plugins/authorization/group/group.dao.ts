import { Group } from '@model/domain/group';
import { UserGroup } from '@plugins/authorization/group/model/user-group';
import { DbConnection } from '@model/shared/db-connection';

export class GroupDao {
  constructor(private db: DbConnection) {}

  async findByName(name: string): Promise<Group | undefined> {
    return this.db<Group>('groups').where({ name }).first();
  }

  async findById(id: number): Promise<Group | undefined> {
    return this.db<Group>('groups').where({ id }).first();
  }

  async findUserGroup(
    groupId: number,
    userId: number
  ): Promise<UserGroup | undefined> {
    return this.db<UserGroup>('user_groups').where({ groupId, userId }).first();
  }

  async findAllByUserId(userId: number): Promise<Group[]> {
    return this.db<Group>('user_groups as ug')
      .join('users as u', 'u.id', 'ug.user_id')
      .join('groups as g', 'g.id', 'ug.group_id')
      .where('ug.user_id', userId)
      .select('g.*');
  }

  async checkUserInGroup(groupId: number, userId: number): Promise<boolean> {
    const { present } = await this.db.first<{ present: boolean }>(
      this.db.raw(
        'exists ? as present',
        this.db('user_groups').select('id').where({ groupId, userId }).limit(1)
      )
    );
    return present;
  }

  async addUser(groupId: number, userId: number): Promise<void> {
    await this.db('user_groups').insert({ groupId, userId });
  }

  async deleteUser(groupId: number, userId: number): Promise<void> {
    await this.db('user_groups').where({ groupId, userId }).delete();
  }

  async create(name: string, ownerId: number): Promise<number> {
    const [{ id: groupId }] = await this.db<Group>('groups')
      .insert({ name, ownerId })
      .returning<[{ id: number }]>('id');
    return groupId;
  }

  async deleteById(id: number): Promise<void> {
    await this.db<Group>('groups').where({ id }).delete();
  }
}
