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
  buildK8sPodIdentifier,
  buildK8sPodLimits,
} from '@src/workdir/contract/env/k8s/k8s.utils';

export class K8sEnvRunner implements EnvRunnerContract {
  private api!: k8s.CoreV1Api;
  private namespace!: string;
  private imagePullPolicy!: string;

  async init(opts: ContractInitOpts) {
    this.imagePullPolicy = opts.contract.imagePullPolicy ?? 'Never';

    const kubeConfig = buildKubeConfigByContractOpts(opts);
    this.namespace = inferCurrentNamespaceByKubeConfig(kubeConfig);

    this.api = kubeConfig.makeApiClient(k8s.CoreV1Api);
    await checkK8sApiHealth(this.api, this.namespace);
  }

  async runEnv(dto: RunEnvDto): Promise<K8sEnvHandle> {
    const { envId, limitations } = dto;
    const identifier = buildK8sPodIdentifier(); // TODO: get from RunEnvDto

    // TODO: handle nodes selection by label
    // TODO: handle lower bound resources
    const podLimits = limitations ? buildK8sPodLimits(limitations) : {};
    const createPodDto: k8s.V1Pod = {
      apiVersion: 'v1',
      metadata: {
        generateName: identifier,
        labels: {
          prescottLabel: identifier,
        },
        namespace: this.namespace,
      },
      spec: {
        restartPolicy: 'Never',
        containers: [
          {
            name: 'prescott-task',
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
    const handleId = podRes.body.metadata?.name as string;
    return new K8sEnvHandle(handleId);
  }

  async getEnvHandle(handleId: string): Promise<K8sEnvHandle> {
    return new K8sEnvHandle(handleId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getEnvChildrenHandleIds(envId: EnvId): Promise<string[]> {
    return [];
  }
}

export default {
  buildContract: async () => new K8sEnvRunner(),
};
