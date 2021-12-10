import { PgConnection } from '@model/shared/pg-connection';
import { RefreshSession } from '@model/domain/refresh-session';

export class RefreshSessionDao {
  constructor(private pg: PgConnection) {}

  async findByIp(
    userId: number,
    ip: string
  ): Promise<RefreshSession | undefined> {
    const session = await this.pg<RefreshSession>('refresh_sessions')
      .select()
      .where({ userId })
      .andWhere({ ip })
      .first();
    return session;
  }

  async findByUser(userId: number): Promise<RefreshSession[]> {
    const sessions = await this.pg<RefreshSession>('refresh_sessions')
      .select()
      .where({ userId });
    return sessions;
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.pg<RefreshSession>('refresh_sessions')
      .where({ userId })
      .delete();
  }

  async add(session: RefreshSession): Promise<void> {
    await this.pg<RefreshSession>('refresh_sessions').insert(session);
  }
}
