import { RefreshSessionDao } from '@plugins/authentication/refresh-session/refresh-session.dao';
import { RefreshSession } from '@plugins/authentication/refresh-session/model/refresh-session';

export class RefreshSessionService {
  constructor(private dao: RefreshSessionDao) {}

  async findByIp(
    userId: number,
    ip: string
  ): Promise<RefreshSession | undefined> {
    return this.dao.findByIp(userId, ip);
  }

  async findByUser(userId: number): Promise<RefreshSession[]> {
    return this.dao.findByUser(userId);
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.dao.deleteByUser(userId);
  }

  async deleteByTokenAndGet(
    refreshToken: string
  ): Promise<RefreshSession | undefined> {
    return this.dao.deleteByTokenAndGet(refreshToken);
  }

  async create(session: RefreshSession): Promise<void> {
    await this.dao.add(session);
  }
}
