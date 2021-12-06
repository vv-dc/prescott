export interface TaskConfig {
  name: string;
  repository?: Repository;
  cronString?: string;
  osInfo: {
    name: string;
    version?: number | string;
  };
  steps?: Step[];
  limitations?: {
    ram?: string;
    rom?: string;
    ttl?: number;
    cpus?: number;
  };
}
export interface Repository {
  url: string;
  branch: string;
}
export interface Step {
  name: string;
  script: string;
  ignoreFailure?: boolean;
}
