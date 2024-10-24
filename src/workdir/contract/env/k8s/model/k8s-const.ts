const PRESCOTT_K8S_POD_CONST = {
  RUNNER_CONTAINER: 'prescott-runner',
  LABEL_ORIGIN_KEY: 'prescott.origin',
  IMAGE_PULL_POLICY: 'IfNotPresent',
  NAMESPACE: 'default',
  FAILURE_EXIT_CODE: 1,
  SUCCESS_EXIT_CODE: 0,
  WAITING_CONTAINER_FAILURE_REASONS: [
    'ErrImagePull',
    'ErrImageNeverPull',
    'InvalidImageName',
  ],
} as const;

const PRESCOTT_K8S_METRIC_CONST = {
  PROVIDER: 'none', // do not collect metrics by default
  INTERVAL_MS: 15_000, // 15s
} as const;

const PRESCOTT_K8S_CONN_CONST = {
  INTERNAL_CLUSTER_NAME: 'prescott-k8s-cluster',
  INTERNAL_USER_NAME: 'prescott-k8s-user',
  INTERNAL_CONTEXT_NAME: 'prescott-k8s-context',
  TOKEN_REFRESH_INTERVAL: 30 * 60 * 1_000, // 30min
} as const;

export {
  PRESCOTT_K8S_POD_CONST,
  PRESCOTT_K8S_METRIC_CONST,
  PRESCOTT_K8S_CONN_CONST,
};
