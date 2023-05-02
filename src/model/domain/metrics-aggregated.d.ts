export interface MetricsAggregated {
  ram: MetricValue;
  cpu: MetricValue;
  [k: string]: MetricValue;
}
export interface MetricValue {
  max?: string;
  min?: string;
  avg?: string;
  std?: string;
  [k: string]: string;
}
