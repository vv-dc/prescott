import { Readable } from 'node:stream';

export interface EnvHandle {
  id(): string;
  stop(dto: StopEnvHandleDto): Promise<void>;
  delete(dto: DeleteEnvHandleDto): Promise<void>;
  /**
   * Should never throw an error and return the exit code with the reason instead
   */
  wait(): Promise<WaitEnvHandleResult>;
  logs(): Promise<Readable>; // Readable<LogEntry>
  metrics(intervalMs?: number): Promise<Readable>; // Readable<MetricEntry>;
}

export interface StopEnvHandleDto {
  timeout?: number;
  signal: StopEnvHandleSignalType;
}

export type StopEnvHandleSignalType = 'timeout' | 'user' | 'system';

export interface DeleteEnvHandleDto {
  isForce: boolean;
}

export interface WaitEnvHandleResult {
  exitCode: number;
  exitError: string | null;
}
