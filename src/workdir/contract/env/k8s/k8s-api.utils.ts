import * as path from 'node:path';
import * as k8s from '@kubernetes/client-node';

import {
  ContractInitOpts,
  ContractOpts,
} from '@modules/contract/model/contract';
import { errorToReason } from '@modules/errors/get-error-reason';
import { ActionOnInvalid } from '@kubernetes/client-node/dist/config_types';

const INTERNAL_CLUSTER_NAME = 'prescott-k8s-cluster';
const INTERNAL_USER_NAME = 'prescott-k8s-user';
const INTERNAL_CONTEXT_NAME = 'prescott-k8s-context';

const DEFAULT_NAMESPACE = 'default';

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
    namespace: opts.namespace,
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

export const checkK8sApiHealth = async (
  apiClient: k8s.CoreV1Api,
  namespace: string
): Promise<void> => {
  await makeK8sApiRequest(() => apiClient.listNamespacedPod(namespace));
};

export const inferCurrentNamespaceByKubeConfig = (
  kubeConfig: k8s.KubeConfig
): string => {
  const currentContextName = kubeConfig.getCurrentContext();
  const allContexts = kubeConfig.getContexts();
  const currentContext = allContexts.find((c) => c.name === currentContextName);
  return currentContext?.namespace ?? DEFAULT_NAMESPACE;
};

export const makeK8sApiRequest = async <T>(
  fn: () => Promise<T>
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    const reason = errorToReason(err);
    // TODO: handle body too
    throw new Error(`K8s-runner: ${reason}`);
  }
};
