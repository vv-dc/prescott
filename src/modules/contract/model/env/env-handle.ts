import { LogEntry } from '@modules/contract/model/log-entry';
import { MetricEntry } from '@modules/contract/model/metric-entry';

export interface EnvHandle {
  id(): string;
  stop(dto: StopEnvHandleDto): Promise<void>;
  delete(dto: DeleteEnvHandleDto): Promise<void>;
  kill(dto: KillEnvHandleDto): Promise<void>; // TODO: remove
  wait(): Promise<number>; // exit code
  logs(): AsyncGenerator<LogEntry>;
  metrics(intervalMs?: number): AsyncGenerator<MetricEntry>;
}

export interface StopEnvHandleDto {
  timeout?: number;
  signal?: number;
  reason?: number;
}

export interface DeleteEnvHandleDto {
  isForce: boolean;
}

export interface KillEnvHandleDto {
  signal: number;
  reason?: string;
}
