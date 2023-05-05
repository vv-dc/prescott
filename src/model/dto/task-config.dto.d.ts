export type TaskConfig = LocalTaskConfig | RepositoryTaskConfig;
export type MemoryLimit = string;

export interface TaskConfigDto {
  name: string;
  envInfo: EnvInfo;
  times?: number;
  config: TaskConfig;
}
export interface EnvInfo {
  name: string;
  version?: string;
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
