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
  makeK8sApiRequest,
  getK8sPodLabelByName,
} from '@src/workdir/contract/env/k8s/lib/k8s-api.utils';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/lib/k8s-pod-state-watch';
import {
  buildK8sPodConfig,
  buildKubeConfigByContractOpts,
} from '@src/workdir/contract/env/k8s/lib/k8s-config.utils';
import { K8sApiWrapper } from './lib/k8s-api-wrapper';
import { K8sPodConfig } from './model/k8s-pod-config';

export class K8sEnvRunner implements EnvRunnerContract {
  private api!: K8sApiWrapper;
  private podConfig!: K8sPodConfig;

  async init(opts: ContractInitOpts): Promise<void> {
    const kubeConfig = buildKubeConfigByContractOpts(opts);
    this.api = new K8sApiWrapper(kubeConfig);
    await this.api.resetTokenIfApplicable(); // maybe token was provided with some delay
    await this.api.assertHealthy();

    const namespace = this.api.getNamespace();
    this.podConfig = buildK8sPodConfig(opts.contract, namespace);
  }

  async runEnv(dto: RunEnvDto): Promise<K8sEnvHandle> {
    const { envKey, label, limitations, script } = dto;

    const podName = generateK8sPodNameByLabel(label);
    const { identifier, stateWatch, envHandle } = this.buildEnvHandle(
      podName,
      label
    );
    await stateWatch.start(); // start watching pod state before its creation to receive ALL events

    // TODO: error handling
    const podDto = buildK8sPodCreateDto(
      identifier,
      this.podConfig.container,
      envKey,
      script,
      limitations ?? null
    );
    await makeK8sApiRequest(
      () =>
        this.api.core.createNamespacedPod(
          this.podConfig.container.namespace,
          podDto
        ),
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
      namespace: this.podConfig.container.namespace,
      runnerContainer: this.podConfig.container.runnerContainer,
    };
    const stateWatch = new K8sPodStateWatch(identifier, this.api.createWatch());
    const envHandle = new K8sEnvHandle(
      identifier,
      stateWatch,
      this.podConfig.metric,
      this.api
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
    const labelSelector = `${this.podConfig.container.originLabel}=${label}`;
    const fieldSelector = 'status.phase!=Failed,status.phase!=Succeeded';

    const { body: podList } = await makeK8sApiRequest(() =>
      this.api.core.listNamespacedPod(
        this.podConfig.container.namespace,
        undefined,
        undefined,
        undefined,
        fieldSelector,
        labelSelector
      )
    );
    return podList.items.map((pod) => pod.metadata?.name as string);
  }
}

export default {
  buildContract: async () => new K8sEnvRunner(),
} satisfies ContractModule;
