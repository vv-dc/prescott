export interface MetricEntry {
  cpu: string;
  ram: string;
  time: number;
  [key: string]: string | number;
}

export interface MetricsAggregated {
  cpu: MetricValue;
  ram: MetricValue;
  [key: string]: MetricValue;
}

export interface MetricValue {
  min?: string;
  max?: string;
  cnt?: string;
  avg?: string;
  [key: string]: string | undefined;
}
