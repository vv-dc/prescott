export type MemoryLimit = string;

export interface DockerRunDto {
  image: string;
  container: string;
  detached: boolean;
  withDelete: boolean;
  context?: string;
  limitations?: Limitations;
}
export interface Limitations {
  ram?: MemoryLimit;
  rom?: MemoryLimit;
  ttl?: number;
  cpus?: number;
}
