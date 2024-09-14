import { LogEntry } from '@modules/contract/model/log-entry';
import { MetricEntry } from '@modules/contract/model/metric-entry';

export interface EnvHandle {
  id(): string;
  stop(dto: StopEnvHandleDto): Promise<void>;
  delete(dto: DeleteEnvHandleDto): Promise<void>;
  wait(): Promise<number>; // TODO: use status and text instead of exit code
  logs(): AsyncGenerator<LogEntry>;
  metrics(intervalMs?: number): AsyncGenerator<MetricEntry>;
}

export interface StopEnvHandleDto {
  timeout?: number;
  signal: StopEnvHandleSignalType;
}

export type StopEnvHandleSignalType = 'timeout' | 'user' | 'system';

export interface DeleteEnvHandleDto {
  isForce: boolean;
}
