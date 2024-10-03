export const K8S_POD_METRIC_PROVIDER_LIST = [
  'metrics-server',
  'none', // no metrics will be collected
] as const;

export type K8sPodMetricProvider =
  (typeof K8S_POD_METRIC_PROVIDER_LIST)[number];

export interface K8sPodMetricConfig {
  provider: K8sPodMetricProvider;
  intervalMs: number;
}
