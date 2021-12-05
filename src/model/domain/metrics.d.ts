export interface Metrics {
  timeTaken?: number;
  retries?: number;
  rom?: Metric;
  ram?: Metric;
  cpu?: Metric;
}
export interface Metric {
  max?: number;
  avg?: number;
}
