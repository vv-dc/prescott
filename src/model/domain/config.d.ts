export interface Config {
  name: string;
  url?: string;
  schedule: Schedule;
  osInfo: {
    name: string;
    version?: number | string;
  };
  steps: {
    name: string;
    script: string;
    retries?: number;
    ignoreFailure?: boolean;
  }[];
  limitations?: {
    ram?: string;
    rom?: string;
    ttl?: number;
    cpus?: number;
  };
}
export interface Schedule {
  times: number;
  cron: string;
}
