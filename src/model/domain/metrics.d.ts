export interface Metrics {
  timeTaken?: number;
  retries?: number;
  ram?: Metric;
  cpu?: Metric;
}
export interface Metric {
  max: number;
  avg: number;
  std: number;
}
