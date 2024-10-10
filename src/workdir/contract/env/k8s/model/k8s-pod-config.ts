export interface K8sPodConfig {
  container: K8sPodContainerConfig;
  metric: K8sPodMetricConfig;
}

export interface K8sPodContainerConfig {
  namespace: string;
  runnerContainer: string;
  originLabel: string;
  pullPolicy: string;
  pullSecret: string | null;
}

export const K8S_POD_METRIC_PROVIDER_LIST = [
  'none', // no metrics will be collected
  'metrics-server',
  'prometheus',
] as const;

export type K8sPodMetricProvider =
  (typeof K8S_POD_METRIC_PROVIDER_LIST)[number];

export interface K8sPodMetricConfig {
  provider: K8sPodMetricProvider;
  intervalMs: number;
  prometheusHost?: string;
}
