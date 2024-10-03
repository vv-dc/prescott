import * as k8s from '@kubernetes/client-node';

import {
  EnvRunnerContract,
  RunEnvDto,
} from '@modules/contract/model/env/env-runner.contract';
import { K8sEnvHandle } from '@src/workdir/contract/env/k8s/k8s-env-handle';
import { ContractInitOpts } from '@modules/contract/model/contract';
import { EnvId } from '@modules/contract/model/env/env-id';
import {
  buildK8sPodCreateDto,
  buildK8sPodNamePrefix,
  checkK8sApiHealth,
  inferCurrentNamespaceByKubeConfig,
  makeK8sApiRequest,
} from '@src/workdir/contract/env/k8s/k8s-api.utils';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/k8s-pod-state-watch';
import {
  buildK8sPodMetricConfig,
  buildKubeConfigByContractOpts,
} from '@src/workdir/contract/env/k8s/k8s-contract-opts.utils';
import { K8sPodMetricConfig } from '@src/workdir/contract/env/k8s/model/k8s-pod-metric-config';

const RUNNER_CONTAINER_NAME = 'prescott-runner';

export class K8sEnvRunner implements EnvRunnerContract {
  private api!: k8s.CoreV1Api;
  private log!: k8s.Log;
  private metric!: k8s.Metrics;
  private kubeConfig!: k8s.KubeConfig;

  private namespace!: string;
  private imagePullPolicy!: string;
  private podMetricConfig!: K8sPodMetricConfig;

  async init(opts: ContractInitOpts) {
    this.imagePullPolicy = opts.contract.imagePullPolicy ?? 'Never';
    this.podMetricConfig = buildK8sPodMetricConfig(opts.contract);

    // TODO: refresh service account token
    const kubeConfig = buildKubeConfigByContractOpts(opts);
    this.kubeConfig = kubeConfig;
    this.namespace = inferCurrentNamespaceByKubeConfig(kubeConfig);

    this.api = kubeConfig.makeApiClient(k8s.CoreV1Api);
    await checkK8sApiHealth(this.api, this.namespace);

    this.log = new k8s.Log(this.kubeConfig);
    this.metric = new k8s.Metrics(this.kubeConfig);
  }

  async runEnv(dto: RunEnvDto): Promise<K8sEnvHandle> {
    const { envId, limitations } = dto;

    const podName = buildK8sPodNamePrefix(); // TODO: get from RunEnvDto
    const { identifier, stateWatch, envHandle } = this.buildEnvHandle(podName);
    await stateWatch.start(); // start watching pod state before its creation to receive ALL events

    // TODO: handle nodes selection by label
    // TODO: handle lower bound resources
    // TODO: error handling
    const podDto = buildK8sPodCreateDto(
      identifier,
      envId,
      this.imagePullPolicy,
      limitations
    );
    await makeK8sApiRequest(
      () => this.api.createNamespacedPod(this.namespace, podDto),
      () => stateWatch.stopIfApplicable()
    );

    await stateWatch.waitNonPending(); // wait until container started before collecting logs/metrics
    const initErrorNullable = stateWatch.getInitError();
    if (initErrorNullable !== null) {
      throw new Error(initErrorNullable);
    }

    return envHandle;
  }

  private buildEnvHandle(podName: string): {
    identifier: K8sPodIdentifier;
    stateWatch: K8sPodStateWatch;
    envHandle: K8sEnvHandle;
  } {
    const identifier: K8sPodIdentifier = {
      name: podName,
      namespace: this.namespace,
      runnerContainer: RUNNER_CONTAINER_NAME,
    };
    const stateWatch = new K8sPodStateWatch(
      identifier,
      new k8s.Watch(this.kubeConfig)
    );
    const envHandle = new K8sEnvHandle(
      identifier,
      stateWatch,
      this.podMetricConfig,
      this.api,
      this.log,
      this.metric
    );
    return { identifier, stateWatch, envHandle };
  }

  async getEnvHandle(podName: string): Promise<K8sEnvHandle> {
    // TODO: populate state from existing pod using describe?
    const { envHandle } = this.buildEnvHandle(podName);
    return envHandle;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getEnvChildrenHandleIds(envId: EnvId): Promise<string[]> {
    return [];
  }
}

export default {
  buildContract: async () => new K8sEnvRunner(),
};
