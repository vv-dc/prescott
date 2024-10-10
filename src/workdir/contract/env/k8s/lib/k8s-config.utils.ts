import * as path from 'node:path';
import * as k8s from '@kubernetes/client-node';

import {
  ContractInitOpts,
  ContractOpts,
} from '@modules/contract/model/contract';
import { errorToReason } from '@modules/errors/get-error-reason';
import { ActionOnInvalid } from '@kubernetes/client-node/dist/config_types';
import {
  PRESCOTT_K8S_CONN_CONST,
  PRESCOTT_K8S_METRIC_CONST,
  PRESCOTT_K8S_POD_CONST,
} from '../model/k8s-const';
import {
  K8S_POD_METRIC_PROVIDER_LIST,
  K8sPodConfig,
  K8sPodContainerConfig,
  K8sPodMetricConfig,
  K8sPodMetricProvider,
} from '../model/k8s-pod-config';

export const buildKubeConfigByContractOpts = (
  opts: ContractInitOpts
): k8s.KubeConfig => {
  try {
    return buildKubeConfigByContractOptsImpl(opts);
  } catch (err) {
    const reason = errorToReason(err);
    throw new Error(`K8s-runner: unable to build API client: ${reason}`);
  }
};

const buildKubeConfigByContractOptsImpl = (
  opts: ContractInitOpts
): k8s.KubeConfig => {
  const { contract, system } = opts;
  assertContractOpts(contract);

  const kc = new k8s.KubeConfig();
  const kcOptions: k8s.ConfigOptions = {
    onInvalidEntry: ActionOnInvalid.THROW,
  };

  if (contract.isInCluster) {
    kc.loadFromDefault(kcOptions);
  } else if (contract.kubeConfigString) {
    kc.loadFromString(contract.kubeConfigString, kcOptions);
  } else if (contract.kubeConfigPath) {
    const fullPath = path.join(system.workDir, contract.kubeConfigPath);
    kc.loadFromFile(fullPath, kcOptions);
  } else {
    const options = buildLoadOptions(contract);
    kc.loadFromOptions(options);
  }

  return kc;
};

const buildLoadOptions = (opts: ContractOpts) => {
  const { INTERNAL_CLUSTER_NAME, INTERNAL_USER_NAME, INTERNAL_CONTEXT_NAME } =
    PRESCOTT_K8S_CONN_CONST;

  const cluster: k8s.Cluster = {
    name: INTERNAL_CLUSTER_NAME,
    server: opts.host as never,
    skipTLSVerify: true,
  };
  const user: k8s.User = {
    name: INTERNAL_USER_NAME,
    token: opts.token,
    // TODO: add support for certs
  };
  const context: k8s.Context = {
    name: INTERNAL_CONTEXT_NAME,
    user: INTERNAL_USER_NAME,
    cluster: INTERNAL_CLUSTER_NAME,
    namespace: opts.namespace || PRESCOTT_K8S_POD_CONST.NAMESPACE,
  };

  return {
    clusters: [cluster],
    users: [user],
    contexts: [context],
    currentContext: context.name,
  };
};

const assertContractOpts = (opts: ContractOpts): void => {
  if (
    !(
      opts.isInCluster ||
      opts.kubeConfigPath ||
      opts.kubeConfigString ||
      (opts.host && opts.token)
    )
  ) {
    throw new Error(
      `opts "kubeConfigPath" | "kubeConfigString" | ("host" & "token") should be provided'`
    );
  }
};

export const buildK8sPodConfig = (
  opts: ContractOpts,
  namespace: string
): K8sPodConfig => {
  return {
    container: buildK8sPodContainerConfig(opts, namespace),
    metric: buildK8sPodMetricConfig(opts),
  };
};

const buildK8sPodContainerConfig = (
  opts: ContractOpts,
  namespace: string
): K8sPodContainerConfig => {
  const pullPolicy =
    opts.imagePullPolicy || PRESCOTT_K8S_POD_CONST.IMAGE_PULL_POLICY;
  const pullSecret = opts.imagePullSecret || null;
  return {
    pullPolicy,
    pullSecret,
    namespace,
    originLabel: PRESCOTT_K8S_POD_CONST.LABEL_ORIGIN_KEY,
    runnerContainer: PRESCOTT_K8S_POD_CONST.RUNNER_CONTAINER,
  };
};

export const buildK8sPodMetricConfig = (
  opts: ContractOpts
): K8sPodMetricConfig => {
  const { metricProvider, metricIntervalMs, prometheusHost } = opts;

  const provider = inferK8sPodMetricProvider(metricProvider);
  const intervalMs = metricIntervalMs
    ? parseInt(metricIntervalMs, 10)
    : PRESCOTT_K8S_METRIC_CONST.INTERVAL_MS;

  if (!intervalMs || intervalMs < 1_000) {
    throw new Error(
      'Metrics collection interval "intervalMs" cannot be lower than 1_000'
    );
  }
  if (provider === 'prometheus' && !prometheusHost) {
    throw new Error(
      'Parameter "prometheusHost" if required for metrics provider "prometheus"'
    );
  }

  return {
    provider,
    intervalMs,
    prometheusHost,
  };
};

const inferK8sPodMetricProvider = (provider?: string): K8sPodMetricProvider => {
  return provider &&
    K8S_POD_METRIC_PROVIDER_LIST.includes(provider as K8sPodMetricProvider)
    ? (provider as K8sPodMetricProvider)
    : PRESCOTT_K8S_METRIC_CONST.PROVIDER;
};
