import { delay } from '@src/lib/time.utils';
import { MetricEntry } from '@src/modules/contract/model/metric/metric-entry';
import { K8sEnvRunnerError, makeK8sApiRequest } from '../lib/k8s-api.utils';
import { K8sPodIdentifier } from '../model/k8s-pod-identifier';
import {
  IsPodActiveFn,
  K8sPodMetricCollector,
} from './k8s-pod-metric-collector';
import { K8sApiWrapper } from '../lib/k8s-api-wrapper';
import { convertByteValue, convertDecimalValue } from './conversion.utils';

export class K8sPodMetricsServerMetricCollector
  implements K8sPodMetricCollector
{
  constructor(
    private readonly identifier: K8sPodIdentifier,
    private readonly api: K8sApiWrapper
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
        this.api.metric.getPodMetrics(namespace, name)
      );
      const { containers } = entry;
      const metric = containers.find((c) => c.name === runnerContainer);
      if (!metric) {
        return [false, null];
      }

      const currentTime = Date.now();
      return [
        false,
        {
          time: currentTime,
          cpu: convertDecimalValue(metric.usage.cpu).toString(),
          ram: convertByteValue(metric.usage.memory).toString(),
        },
      ];
    } catch (err) {
      if (!(err instanceof K8sEnvRunnerError)) {
        return [false, null];
      }
      const isLastMetric = err.statusCode !== 404; // metrics were not collected yet
      return [isLastMetric, null];
    }
  }
}
