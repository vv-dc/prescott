import * as k8s from '@kubernetes/client-node';

import {
  EnvRunnerContract,
  RunEnvDto,
} from '@modules/contract/model/env/env-runner.contract';
import { K8sEnvHandle } from '@src/workdir/contract/env/k8s/k8s-env-handle';
import { generateRandomString } from '@lib/random.utils';
import { ContractInitOpts } from '@modules/contract/model/contract';
import { EnvId } from '@modules/contract/model/env/env-id';
import {
  buildKubeConfigByContractOpts,
  checkK8sApiHealth,
  inferCurrentNamespaceByKubeConfig,
} from '@src/workdir/contract/env/k8s/k8s-api.utils';

export class K8sEnvRunner implements EnvRunnerContract {
  private apiClient!: k8s.CoreV1Api;
  private namespace!: string;

  async init(opts: ContractInitOpts) {
    const kubeConfig = buildKubeConfigByContractOpts(opts);
    this.namespace = inferCurrentNamespaceByKubeConfig(kubeConfig);
    this.apiClient = kubeConfig.makeApiClient(k8s.CoreV1Api);
    await checkK8sApiHealth(this.apiClient, this.namespace);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async runEnv(dto: RunEnvDto): Promise<K8sEnvHandle> {
    const handleId = generateRandomString();
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
