export type MemoryLimit = string;

export interface Limitations {
  ram?: MemoryLimit;
  rom?: MemoryLimit;
  cpus?: number;
  ttl?: number;
}
