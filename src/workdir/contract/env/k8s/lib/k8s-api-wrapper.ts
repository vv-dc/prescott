import * as k8s from '@kubernetes/client-node';

import { PRESCOTT_K8S_CONN_CONST } from '../model/k8s-const';
import {
  inferNamespaceByKubeConfig,
  inferServiceAccountByKubeConfig,
  makeK8sApiRequest,
} from './k8s-api.utils';
import { K8sApiTokenStorage } from './k8s-api-token-storage';

/**
 * All K8s API calls should be made via this class
 * Service account token needs to be refreshed regularly
 * default TTL of the token is only 1 hour
 */
export class K8sApiWrapper {
  core!: k8s.CoreV1Api;
  log!: k8s.Log;
  metric!: k8s.Metrics;

  private tokenStorage: K8sApiTokenStorage | null = null;
  private kubeConfig!: k8s.KubeConfig;
  private namespace!: string;
  private serviceAccount!: string;

  constructor(workDir: string, kubeConfig: k8s.KubeConfig) {
    const initialToken = this.inferTokenByKubeConfig(kubeConfig);
    if (initialToken !== null) {
      this.tokenStorage = new K8sApiTokenStorage(workDir, initialToken);
    }
    this.resetKubeConfig(kubeConfig);
    this.namespace = inferNamespaceByKubeConfig(kubeConfig);
    this.serviceAccount = inferServiceAccountByKubeConfig(kubeConfig);
  }

  async init(): Promise<void> {
    if (this.tokenStorage === null) {
      return;
    }

    const savedToken = await this.tokenStorage.tryToLoadToken();
    if (savedToken !== null) {
      this.applyNewToken(savedToken);
    }

    await this.tokenStorage.ensureStorage();
    await this.resetTokenIfApplicable(); // try to refresh it immediately
    this.registerResetTokenInterval();
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

  private inferTokenByKubeConfig(kubeConfig: k8s.KubeConfig): string | null {
    const currentUser = kubeConfig.getCurrentUser();
    return currentUser?.token ?? null;
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

  private async resetTokenIfApplicable(): Promise<void> {
    if (!this.tokenStorage) {
      return;
    }
    const newToken = await this.makeRefreshTokenRequest(
      this.namespace,
      this.serviceAccount
    );
    this.applyNewToken(newToken);
    await this.tokenStorage.saveToken(newToken);
  }

  private applyNewToken(newToken: string): void {
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
