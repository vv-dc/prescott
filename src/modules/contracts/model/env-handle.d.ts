import { LogEntry, MetricEntry } from '@plugins/docker/docker.service';

export interface EnvHandle {
  stop(dto: StopEnvHandleDto): Promise<void>;
  delete(dto: DeleteEnvHandleDto): Promise<void>;
  id(): string;
  logs(): AsyncGenerator<LogEntry>;
  metrics(): AsyncGenerator<MetricEntry>;
}

export interface StopEnvHandleDto {
  timeout?: number;
  force: boolean;
}

export interface DeleteEnvHandleDto {
  force: boolean;
}
