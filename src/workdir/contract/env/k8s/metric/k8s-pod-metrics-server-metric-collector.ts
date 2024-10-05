import * as k8s from '@kubernetes/client-node';
import { delay } from '@src/lib/time.utils';

import { MetricEntry } from '@src/modules/contract/model/metric/metric-entry';
import { K8sEnvRunnerError, makeK8sApiRequest } from '../util/k8s-api.utils';
import { K8sPodIdentifier } from '../model/k8s-pod-identifier';
import {
  IsPodActiveFn,
  K8sPodMetricCollector,
} from './k8s-pod-metric-collector';

export class K8sPodMetricsServerMetricCollector
  implements K8sPodMetricCollector
{
  private lastTime: number | null = null;

  constructor(
    private readonly identifier: K8sPodIdentifier,
    private readonly metric: k8s.Metrics
  ) {}

  async *collect(
    intervalMs: number,
    isPodActive: IsPodActiveFn
  ): AsyncGenerator<MetricEntry> {
    while (isPodActive()) {
      const [isLast, metric] = await this.collectNext();
      if (metric) yield metric;
      if (isLast) break;

      await delay(intervalMs);
    }
  }

  private async collectNext(): Promise<[boolean, MetricEntry | null]> {
    const { namespace, name, runnerContainer } = this.identifier;

    try {
      const entry = await makeK8sApiRequest(() =>
        this.metric.getPodMetrics(namespace, name)
      );
      const { containers, timestamp } = entry;
      const metric = containers.find((c) => c.name === runnerContainer);
      if (!metric) {
        return [false, null];
      }

      const currentTime = Date.parse(timestamp);
      if (this.lastTime !== null && currentTime === this.lastTime) {
        return [false, null]; // skip duplicate
      }

      this.lastTime = currentTime;
      return [
        false,
        {
          time: currentTime,
          cpu: metric.usage.cpu,
          ram: metric.usage.memory,
        },
      ];
    } catch (err) {
      // TODO: implement backoff - increase wait time when 404 happens too many times in a row?
      if (!(err instanceof K8sEnvRunnerError)) {
        return [false, null];
      }
      const isLastMetric = err.statusCode !== 404; // metrics were not collected yet
      return [isLastMetric, null];
    }
  }
}
