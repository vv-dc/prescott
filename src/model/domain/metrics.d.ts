export interface Metrics {
  timeTaken?: number;
  retries?: number;
  ram?: MetricValue;
  cpu?: MetricValue;
}
export interface MetricValue {
  max: number;
  avg: number;
  std: number;
}
