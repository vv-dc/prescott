export interface EnvHandle {
  stop(dto: StopEnvHandleDto): Promise<void>;
  delete(dto: DeleteEnvHandleDto): Promise<void>;
  id(): string;
  logs(): AsyncGenerator<LogEntry>;
  metrics(): AsyncGenerator<MetricEntry>;
}

export interface StopEnvHandleDto {
  timeout?: number;
  isForce: boolean;
}

export interface DeleteEnvHandleDto {
  isForce: boolean;
}
