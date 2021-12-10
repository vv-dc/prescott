export interface TaskConfigDto {
  name: string;
  osInfo: {
    name: string;
    version?: number | string;
  };
  once?: boolean;
  config: LocalTaskConfig | RepositoryTaskConfig;
}
export interface LocalTaskConfig {
  local: {
    cronString: string;
  };
  config: BaseTaskConfig;
}
export interface BaseTaskConfig {
  steps: Step[];
  limitations?: {
    ram?: string;
    rom?: string;
    ttl?: number;
    cpus?: number;
  };
}
export interface Step {
  name: string;
  script: string;
  ignoreFailure?: boolean;
}
export interface RepositoryTaskConfig {
  repository: {
    url: string;
    branch: string;
  };
  config?: BaseTaskConfig;
}
