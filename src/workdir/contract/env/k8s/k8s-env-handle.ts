import { PassThrough } from 'node:stream';
import * as k8s from '@kubernetes/client-node';

import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
  WaitEnvHandleResult,
} from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import { makeK8sApiRequest } from '@src/workdir/contract/env/k8s/k8s-api.utils';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/k8s-pod-state-watch';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { transformReadableToRFC3339LogGenerator } from '@lib/log.utils';
import { delay } from '@lib/time.utils';
import { K8sPodMetricConfig } from '@src/workdir/contract/env/k8s/model/k8s-pod-metric-config';

export class K8sEnvHandle implements EnvHandle {
  private readonly podName: string;
  private readonly namespace: string;
  private readonly runnerContainer: string;

  constructor(
    identifier: K8sPodIdentifier,
    private readonly stateWatch: K8sPodStateWatch,
    private readonly metricConfig: K8sPodMetricConfig,
    private readonly log: k8s.Log,
    private readonly metric: k8s.Metrics
  ) {
    this.podName = identifier.name;
    this.namespace = identifier.namespace;
    this.runnerContainer = identifier.runnerContainer;
  }

  id() {
    return this.podName;
  }

  async wait(): Promise<WaitEnvHandleResult> {
    await this.stateWatch.waitTerminal();
    return {
      exitCode: this.stateWatch.getExitCodeThrowable(),
      exitError: this.stateWatch.getExitError(),
    };
  }

  // there is no difference between stop and delete of pod in K8S
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stop(dto: StopEnvHandleDto): Promise<void> {
    // TODO: impl
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(dto: DeleteEnvHandleDto): Promise<void> {
    // TODO: impl
  }

  async *logs(): AsyncGenerator<LogEntry> {
    const readable = new PassThrough();

    await makeK8sApiRequest(() =>
      this.log.log(
        this.namespace,
        this.podName,
        this.runnerContainer,
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
    if (this.metricConfig.provider === 'metrics-server') {
      yield* this.metricsMetricServer(
        intervalMs ?? this.metricConfig.intervalMs
      );
    }
  }

  private async *metricsMetricServer(
    intervalMs: number
  ): AsyncGenerator<MetricEntry> {
    while (!this.stateWatch.isStateTerminal()) {
      const [isLast, metric] = await this.getMetricsServerEntrySafe();
      if (metric) yield metric;
      if (isLast) break;

      await delay(intervalMs);
    }
  }

  private async getMetricsServerEntrySafe(): Promise<
    [boolean, MetricEntry | null]
  > {
    try {
      const entry = await makeK8sApiRequest(() =>
        this.metric.getPodMetrics(this.namespace, this.podName)
      );
      const { containers, timestamp } = entry;
      const metric = containers.find((c) => c.name === this.runnerContainer);
      if (!metric) {
        return [false, null];
      }

      return [
        false,
        {
          time: Date.parse(timestamp),
          cpu: metric.usage.cpu,
          ram: metric.usage.memory,
        },
      ];
    } catch (err) {
      // TODO: implement backoff - increase wait time when 404 happens too many times in a row?
      if (!(err instanceof k8s.HttpError)) {
        return [false, null];
      }
      const isLastMetric = err.statusCode !== 404; // metrics were not collected yet
      return [isLastMetric, null];
    }
  }
}
