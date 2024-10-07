import * as k8s from '@kubernetes/client-node';

import { PRESCOTT_K8S_CONN_CONST } from '../model/k8s-const';
import {
  inferNamespaceByKubeConfig,
  inferServiceAccountByKubeConfig,
  makeK8sApiRequest,
} from './k8s-api.utils';

/**
 * All K8s API calls should be made via this class
 * Service account token needs to be refreshed regularly
 * default TTL of the token is only 1 hour
 */
export class K8sApiWrapper {
  core!: k8s.CoreV1Api;
  log!: k8s.Log;
  metric!: k8s.Metrics;

  private isResetToken!: boolean;
  private kubeConfig!: k8s.KubeConfig;
  private namespace!: string;
  private serviceAccount!: string;

  constructor(kubeConfig: k8s.KubeConfig) {
    this.resetKubeConfig(kubeConfig);
    this.namespace = inferNamespaceByKubeConfig(kubeConfig);
    this.serviceAccount = inferServiceAccountByKubeConfig(kubeConfig);

    this.isResetToken = this.checkIsShouldResetToken(kubeConfig);
    if (this.isResetToken) {
      this.registerResetTokenInterval();
    }
  }

  async assertHealthy(): Promise<void> {
    await makeK8sApiRequest(() => this.core.listNamespacedPod(this.namespace));
  }

  getNamespace(): string {
    return this.namespace;
  }

  createWatch(): k8s.Watch {
    return new k8s.Watch(this.kubeConfig);
  }

  private checkIsShouldResetToken(kubeConfig: k8s.KubeConfig): boolean {
    const currentUser = kubeConfig.getCurrentUser();
    return Boolean(currentUser?.token);
  }

  private resetKubeConfig(kubeConfig: k8s.KubeConfig): void {
    this.kubeConfig = kubeConfig;
    this.core = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.log = new k8s.Log(kubeConfig);
    this.metric = new k8s.Metrics(kubeConfig);
  }

  private registerResetTokenInterval(): void {
    setInterval(
      () => this.resetTokenIfApplicable(),
      PRESCOTT_K8S_CONN_CONST.TOKEN_REFRESH_INTERVAL
    );
  }

  async resetTokenIfApplicable(): Promise<void> {
    if (!this.isResetToken) {
      return;
    }
    const newToken = await this.makeRefreshTokenRequest(
      this.namespace,
      this.serviceAccount
    );
    const newKubeConfig = this.enrichKubeConfigByNewToken(
      this.kubeConfig,
      newToken
    );
    this.resetKubeConfig(newKubeConfig);
  }

  private async makeRefreshTokenRequest(
    namespace: string,
    serviceAccount: string
  ): Promise<string> {
    const tokenRequest = new k8s.AuthenticationV1TokenRequest();
    const { body } = await makeK8sApiRequest(() =>
      this.core.createNamespacedServiceAccountToken(
        serviceAccount,
        namespace,
        tokenRequest
      )
    );
    return body.status?.token as string;
  }

  private enrichKubeConfigByNewToken(
    kubeConfig: k8s.KubeConfig,
    token: string
  ): k8s.KubeConfig {
    const { clusters, contexts, currentContext } = kubeConfig;
    const currentUser = kubeConfig.getCurrentUser();

    const newUser: k8s.User = {
      name: currentUser?.name ?? PRESCOTT_K8S_CONN_CONST.INTERNAL_USER_NAME,
      token,
    };
    const newKubeConfig = new k8s.KubeConfig();
    newKubeConfig.loadFromOptions({
      clusters,
      contexts,
      currentContext,
      users: [newUser],
    });

    return newKubeConfig;
  }
}
