import * as k8s from '@kubernetes/client-node';

import {
  EnvRunnerContract,
  RunEnvDto,
} from '@modules/contract/model/env/env-runner.contract';
import { K8sEnvHandle } from '@src/workdir/contract/env/k8s/k8s-env-handle';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';
import {
  buildK8sPodCreateDto,
  generateK8sPodNameByLabel,
  checkK8sApiHealth,
  inferCurrentNamespaceByKubeConfig,
  makeK8sApiRequest,
  getK8sPodLabelByName,
} from '@src/workdir/contract/env/k8s/k8s-api.utils';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/k8s-pod-state-watch';
import {
  buildK8sPodMetricConfig,
  buildKubeConfigByContractOpts,
} from '@src/workdir/contract/env/k8s/k8s-contract-opts.utils';
import { K8sPodMetricConfig } from '@src/workdir/contract/env/k8s/model/k8s-pod-metric-config';
import { PRESCOTT_POD_K8S_CONST } from '@src/workdir/contract/env/k8s/model/k8s-const';

export class K8sEnvRunner implements EnvRunnerContract {
  private api!: k8s.CoreV1Api;
  private log!: k8s.Log;
  private metric!: k8s.Metrics;
  private kubeConfig!: k8s.KubeConfig;

  private namespace!: string;
  private imagePullPolicy!: string;
  private podMetricConfig!: K8sPodMetricConfig;

  async init(opts: ContractInitOpts): Promise<void> {
    this.imagePullPolicy =
      opts.contract.imagePullPolicy || PRESCOTT_POD_K8S_CONST.IMAGE_PULL_POLICY;
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
    const { envKey, label, limitations } = dto;

    const podName = generateK8sPodNameByLabel(label);
    const { identifier, stateWatch, envHandle } = this.buildEnvHandle(
      podName,
      label
    );
    await stateWatch.start(); // start watching pod state before its creation to receive ALL events

    // TODO: handle lower bound resources
    // TODO: error handling
    const podDto = buildK8sPodCreateDto(
      identifier,
      envKey,
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

  private buildEnvHandle(
    podName: string,
    label: string
  ): {
    identifier: K8sPodIdentifier;
    stateWatch: K8sPodStateWatch;
    envHandle: K8sEnvHandle;
  } {
    const identifier: K8sPodIdentifier = {
      name: podName,
      label,
      namespace: this.namespace,
      runnerContainer: PRESCOTT_POD_K8S_CONST.RUNNER_CONTAINER,
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
    const label = getK8sPodLabelByName(podName);
    const { envHandle } = this.buildEnvHandle(podName, label);
    return envHandle;
  }

  // IN is not supported by field-selector: https://github.com/kubernetes/kubernetes/issues/32946
  async getEnvChildrenHandleIds(label: string): Promise<string[]> {
    const labelSelector = `${PRESCOTT_POD_K8S_CONST.LABEL_ORIGIN_KEY}=${label}`;
    const fieldSelector = 'status.phase!=Failed,status.phase!=Succeeded';

    const { body: podList } = await this.api.listNamespacedPod(
      this.namespace,
      undefined,
      undefined,
      undefined,
      fieldSelector,
      labelSelector
    );
    return podList.items.map((pod) => pod.metadata?.name as string);
  }
}

export default {
  buildContract: async () => new K8sEnvRunner(),
} satisfies ContractModule;
