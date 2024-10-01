import * as k8s from '@kubernetes/client-node';

import {
  EnvRunnerContract,
  RunEnvDto,
} from '@modules/contract/model/env/env-runner.contract';
import { K8sEnvHandle } from '@src/workdir/contract/env/k8s/k8s-env-handle';
import { ContractInitOpts } from '@modules/contract/model/contract';
import { EnvId } from '@modules/contract/model/env/env-id';
import {
  buildKubeConfigByContractOpts,
  checkK8sApiHealth,
  inferCurrentNamespaceByKubeConfig,
  makeK8sApiRequest,
} from '@src/workdir/contract/env/k8s/k8s-api.utils';
import {
  buildK8sPodNamePrefix,
  buildK8sPodLimits,
} from '@src/workdir/contract/env/k8s/k8s.utils';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/k8s-pod-state-watch';

export class K8sEnvRunner implements EnvRunnerContract {
  private api!: k8s.CoreV1Api;
  private kubeConfig!: k8s.KubeConfig;

  private namespace!: string;
  private imagePullPolicy!: string;
  private runnerContainer!: string;

  async init(opts: ContractInitOpts) {
    this.imagePullPolicy = opts.contract.imagePullPolicy ?? 'Never';
    this.runnerContainer = opts.contract.runnerContainer ?? 'prescott-runner';

    // TODO: refresh service account token
    const kubeConfig = buildKubeConfigByContractOpts(opts);
    this.kubeConfig = kubeConfig;
    this.namespace = inferCurrentNamespaceByKubeConfig(kubeConfig);

    this.api = kubeConfig.makeApiClient(k8s.CoreV1Api);
    await checkK8sApiHealth(this.api, this.namespace);
  }

  async runEnv(dto: RunEnvDto): Promise<K8sEnvHandle> {
    const { envId, limitations } = dto;
    const namePrefix = buildK8sPodNamePrefix(); // TODO: get from RunEnvDto

    // TODO: handle nodes selection by label
    // TODO: handle lower bound resources
    const podLimits = limitations ? buildK8sPodLimits(limitations) : {};
    const createPodDto: k8s.V1Pod = {
      apiVersion: 'v1',
      metadata: {
        generateName: namePrefix,
        labels: {},
        namespace: this.namespace,
      },
      spec: {
        restartPolicy: 'Never',
        containers: [
          {
            name: this.runnerContainer,
            image: envId,
            imagePullPolicy: this.imagePullPolicy,
            resources: { limits: podLimits },
          },
        ],
      },
    };

    const podRes = await makeK8sApiRequest(() =>
      this.api.createNamespacedPod(this.namespace, createPodDto)
    );

    const podName = podRes.body.metadata?.name as string;
    const [stateWatch, envHandle] = this.buildEnvHandleWithStateWatch(podName);

    // wait until running to make sure container started before collecting logs/metrics
    await stateWatch.start();
    await stateWatch.waitNonPending();

    return envHandle;
  }

  private buildEnvHandleWithStateWatch(
    podName: string
  ): [K8sPodStateWatch, K8sEnvHandle] {
    const identifier: K8sPodIdentifier = {
      name: podName,
      namespace: this.namespace,
      runnerContainer: this.runnerContainer,
    };
    const stateWatch = new K8sPodStateWatch(
      identifier,
      new k8s.Watch(this.kubeConfig)
    );
    const envHandle = new K8sEnvHandle(
      identifier,
      stateWatch,
      new k8s.Log(this.kubeConfig),
      new k8s.Metrics(this.kubeConfig)
    );
    return [stateWatch, envHandle];
  }

  async getEnvHandle(podName: string): Promise<K8sEnvHandle> {
    // TODO: populate state from existing pod using describe?
    const [, envHandle] = this.buildEnvHandleWithStateWatch(podName);
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
