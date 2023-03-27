export type TaskConfig = LocalTaskConfig | RepositoryTaskConfig;
export type MemoryLimit = string;

export interface TaskConfigDto {
  name: string;
  osInfo: OsInfo;
  once?: boolean;
  config: TaskConfig;
}
export interface OsInfo {
  name: string;
  version?: number | string;
}
export interface LocalTaskConfig {
  local: {
    cronString: string;
  };
  appConfig: BaseTaskConfig;
}
export interface BaseTaskConfig {
  steps: TaskStep[];
  limitations?: Limitations;
}
export interface TaskStep {
  name: string;
  script: string;
  ignoreFailure?: boolean;
}
export interface Limitations {
  ram?: MemoryLimit;
  rom?: MemoryLimit;
  ttl?: number;
  cpus?: number;
}
export interface RepositoryTaskConfig {
  repository: {
    url: string;
    branch: string;
  };
  appConfig: BaseTaskConfig;
}
