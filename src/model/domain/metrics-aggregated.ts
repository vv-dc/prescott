export interface MetricsAggregated {
  [k: string]: MetricValue;
}
export interface MetricValue {
  [k: string]: string;
}
