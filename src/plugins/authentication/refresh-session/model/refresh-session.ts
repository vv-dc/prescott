export interface RefreshSession {
  id?: number;
  userId: number;
  refreshToken: string;
  ip: string;
  expiresIn: number;
  createdAt: Date;
}
