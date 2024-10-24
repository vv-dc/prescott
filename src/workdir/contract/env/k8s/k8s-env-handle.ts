import { PassThrough } from 'node:stream';

import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
  WaitEnvHandleResult,
} from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import { makeK8sApiRequest } from '@src/workdir/contract/env/k8s/lib/k8s-api.utils';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/lib/k8s-pod-state-watch';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { transformReadableToRFC3339LogGenerator } from '@lib/log.utils';
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

  async *logs(): AsyncGenerator<LogEntry> {
    const readable = new PassThrough();

    await makeK8sApiRequest(() =>
      this.api.log.log(
        this.identifier.namespace,
        this.identifier.name,
        this.identifier.runnerContainer,
        readable,
        {
          follow: true,
          pretty: false,
          timestamps: true,
        }
      )
    );

    // k8s doesn't separate stdout / stderr
    yield* transformReadableToRFC3339LogGenerator(readable, 'stdout');
  }

  async *metrics(intervalMs?: number): AsyncGenerator<MetricEntry> {
    const collector = this.getMetricCollector();
    if (collector === null) {
      return;
    }
    const isPodActiveFn = () => !this.stateWatch.isStateTerminal();
    const realIntervalMs = intervalMs ?? this.metricConfig.intervalMs;
    yield* collector.collect(realIntervalMs, isPodActiveFn);
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
