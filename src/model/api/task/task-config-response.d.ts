export type TaskConfigResponse = Task & TaskConfig;
export type TaskConfig = LocalTaskConfig | RepositoryTaskConfig;
export type MemoryLimit = string;

export interface Task {
  id?: number;
  name: string;
  userId: number;
  groupId: number;
  /**
   * base64 encoded TaskConfig
   */
  config: string;
  active?: boolean;
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
  appConfig?: BaseTaskConfig;
}
