import { RefreshSessionDao } from '@plugins/auth/daos/refresh-session.dao';
import { RefreshSession } from '@model/domain/refresh-session';

export class RefreshSessionService {
  constructor(private dao: RefreshSessionDao) {}

  async findByIp(
    userId: number,
    ip: string
  ): Promise<RefreshSession | undefined> {
    const session = this.dao.findByIp(userId, ip);
    return session;
  }

  async findByUser(userId: number): Promise<RefreshSession[]> {
    const sessions = await this.dao.findByUser(userId);
    return sessions;
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.dao.deleteByUser(userId);
  }

  async add(session: RefreshSession): Promise<void> {
    await this.dao.add(session);
  }
}
