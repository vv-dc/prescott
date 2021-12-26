export type MemoryLimit = string;

export interface Limitations {
  ram?: MemoryLimit;
  rom?: MemoryLimit;
  ttl?: number;
  cpus?: number;
}
