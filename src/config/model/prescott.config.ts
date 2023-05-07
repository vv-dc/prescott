import { LevelWithSilent } from 'pino';

export interface PrescottConfig {
  workDir: string;
  logLevel: LevelWithSilent;
}
