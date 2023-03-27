export type MemoryLimit = string;

export interface RepositoryTaskConfig {
  repository: {
    url: string;
    branch: string;
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
