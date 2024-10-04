const PRESCOTT_POD_K8S_CONST = {
  RUNNER_CONTAINER: 'prescott-runner',
  LABEL_ORIGIN_KEY: 'prescott.origin',
  IMAGE_PULL_POLICY: 'Never',
} as const;

export { PRESCOTT_POD_K8S_CONST };
