import { RefreshSession } from '@plugins/authentication/refresh-session/model/refresh-session';
import { DbConnection } from '@model/shared/db-connection';
import { parseDate } from '@lib/date.utils';

export class RefreshSessionDao {
  constructor(private db: DbConnection) {}

  private mapRefreshSession(session: RefreshSession): RefreshSession {
    return {
      ...session,
      createdAt: parseDate(session.createdAt),
    };
  }

  async findByIp(
    userId: number,
    ip: string
  ): Promise<RefreshSession | undefined> {
    const session = await this.db<RefreshSession>('refresh_sessions')
      .where({ userId, ip })
      .first();
    return session && this.mapRefreshSession(session);
  }

  async findByUser(userId: number): Promise<RefreshSession[]> {
    const sessions = await this.db<RefreshSession>('refresh_sessions')
      .select('*')
      .where({ userId });
    return sessions.map((session) => this.mapRefreshSession(session));
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.db<RefreshSession>('refresh_sessions')
      .where({ userId })
      .delete();
  }

  async deleteByTokenAndGet(
    refreshToken: string
  ): Promise<RefreshSession | undefined> {
    const session = await this.db<RefreshSession>('refresh_sessions')
      .where({ refreshToken })
      .first();
    if (session !== undefined) {
      await this.db('refresh_sessions').where({ id: session.id }).delete();
    }
    return session && this.mapRefreshSession(session);
  }

  async add(session: RefreshSession): Promise<void> {
    await this.db<RefreshSession>('refresh_sessions').insert(session);
  }
}
