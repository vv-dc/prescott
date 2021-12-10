export interface JwtConfig {
  secret: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}
