import { RefreshSessionDao } from '@plugins/authentication/refresh-session/refresh-session.dao';
import { RefreshSession } from '@plugins/authentication/refresh-session/model/refresh-session';

export class RefreshSessionService {
  constructor(private dao: RefreshSessionDao) {}

  async findByIp(
    userId: number,
    ip: string
  ): Promise<RefreshSession | undefined> {
    const session = await this.dao.findByIp(userId, ip);
    return session;
  }

  async findByUser(userId: number): Promise<RefreshSession[]> {
    const sessions = await this.dao.findByUser(userId);
    return sessions;
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.dao.deleteByUser(userId);
  }

  async deleteByTokenAndGet(
    refreshToken: string
  ): Promise<RefreshSession | undefined> {
    const session = await this.dao.deleteByTokenAndGet(refreshToken);
    return session;
  }

  async create(session: RefreshSession): Promise<void> {
    await this.dao.add(session);
  }
}
