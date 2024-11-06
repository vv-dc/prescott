import { PassThrough, Readable } from 'node:stream';

import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
  WaitEnvHandleResult,
} from '@modules/contract/model/env/env-handle';
import { makeK8sApiRequest } from '@src/workdir/contract/env/k8s/lib/k8s-api.utils';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/lib/k8s-pod-state-watch';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { TranformRFC3339LogStream } from '@lib/log.utils';
import { millisecondsToSeconds } from '@lib/time.utils';
import { K8sPodMetricsServerMetricCollector } from './metric/k8s-pod-metrics-server-metric-collector';
import { K8sPodMetricCollector } from './metric/k8s-pod-metric-collector';
import { K8sPodPrometheusMetricCollector } from './metric/k8s-pod-prometheus-metric-collector';
import { K8sApiWrapper } from './lib/k8s-api-wrapper';
import { K8sPodMetricConfig } from './model/k8s-pod-config';

export class K8sEnvHandle implements EnvHandle {
  constructor(
    private readonly identifier: K8sPodIdentifier,
    private readonly stateWatch: K8sPodStateWatch,
    private readonly metricConfig: K8sPodMetricConfig,
    private readonly api: K8sApiWrapper
  ) {}

  id() {
    return this.identifier.name;
  }

  async wait(): Promise<WaitEnvHandleResult> {
    await this.stateWatch.waitTerminal();
    return {
      exitCode: this.stateWatch.getExitCodeThrowable(),
      exitError: this.stateWatch.getExitError(),
    };
  }

  // there is no difference between stop and delete of pod in K8s
  async stop(dto: StopEnvHandleDto): Promise<void> {
    const { timeout } = dto;
    const seconds =
      timeout !== undefined ? millisecondsToSeconds(timeout) : undefined;
    return this.deleteImpl(seconds);
  }

  async delete(dto: DeleteEnvHandleDto): Promise<void> {
    const gracePeriod = dto.isForce ? 0 : undefined;
    await this.deleteImpl(gracePeriod);
  }

  /**
   * @param gracePeriodSeconds time to wait before sending SIGKILL signal after SIGTERM.
   * If 0, then SIGKILL is sent immediately. Default period is 30 seconds
   */
  private async deleteImpl(gracePeriodSeconds?: number): Promise<void> {
    await makeK8sApiRequest(() =>
      this.api.core.deleteNamespacedPod(
        this.identifier.name,
        this.identifier.namespace,
        undefined,
        undefined,
        gracePeriodSeconds ?? 30
      )
    );
  }

  async logs(): Promise<Readable> {
    const readableStream = new PassThrough();

    await makeK8sApiRequest(() =>
      this.api.log.log(
        this.identifier.namespace,
        this.identifier.name,
        this.identifier.runnerContainer,
        readableStream,
        {
          follow: true,
          pretty: false,
          timestamps: true,
        }
      )
    );

    // k8s doesn't separate stdout / stderr
    const tranformStream = new TranformRFC3339LogStream('stdout');
    return readableStream.pipe(tranformStream);
  }

  async metrics(intervalMs?: number): Promise<Readable> {
    const collector = this.getMetricCollector();
    if (collector === null) {
      return Readable.from([], { objectMode: true });
    }
    const isPodActiveFn = () => !this.stateWatch.isStateTerminal();
    const realIntervalMs = intervalMs ?? this.metricConfig.intervalMs;
    return Readable.from(collector.collect(realIntervalMs, isPodActiveFn));
  }

  private getMetricCollector(): K8sPodMetricCollector | null {
    if (this.metricConfig.provider === 'metrics-server') {
      return new K8sPodMetricsServerMetricCollector(this.identifier, this.api);
    } else if (this.metricConfig.provider === 'prometheus') {
      return new K8sPodPrometheusMetricCollector(
        this.identifier,
        this.metricConfig.prometheusHost as never // validated in runtime
      );
    }
    return null;
  }
}
