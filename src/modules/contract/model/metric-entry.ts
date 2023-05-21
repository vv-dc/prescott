export interface MetricEntry {
  cpu: string;
  ram: string;
  time: number;
  [key: string]: string | number;
}

export interface MetricsAggregated {
  [key: string]: MetricValue; // cpu, ram
}

export interface MetricValue {
  [key: string]: string; // min, max, avg, cnt, std
}
