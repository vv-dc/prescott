import { delay, secondsToMilliseconds } from '@src/lib/time.utils';
import { getLogger } from '@src/logger/logger';
import { MetricEntry } from '@src/modules/contract/model/metric/metric-entry';
import { errorToReason } from '@src/modules/errors/get-error-reason';
import { K8sPodIdentifier } from '../model/k8s-pod-identifier';
import {
  IsPodActiveFn,
  K8sPodMetricCollector,
} from './k8s-pod-metric-collector';

interface K8sPodPrometheusMetricResponse {
  status: 'success' | 'error';
  data: {
    result: K8sPodPrometheusMetric[];
  };
}

interface K8sPodPrometheusMetric {
  metric: { prescott_metric: 'cpu' | 'ram' };
  value: [number, string]; // timestamp, value
}

export class K8sPodPrometheusMetricCollector implements K8sPodMetricCollector {
  private readonly label: string;
  private readonly queryUrl: string;
  private readonly logger = getLogger('k8s-pod-prometheus-metric-collector');

  private lastTime: number | null = null; // timestamp of last measurement

  constructor(identifier: K8sPodIdentifier, prometheusHost: string) {
    this.label = this.buildLabel(identifier);
    this.queryUrl = this.buildQueryUrl(prometheusHost);
  }

  private buildLabel(identifier: K8sPodIdentifier): string {
    const { namespace, name, runnerContainer } = identifier;
    return `{pod='${name}',container='${runnerContainer}',namespace='${namespace}'}`;
  }

  private buildQueryUrl(prometheusHost: string): string {
    return `${prometheusHost}/api/v1/query`;
  }

  async *collect(
    intervalMs: number,
    isPodActiveFn: IsPodActiveFn
  ): AsyncGenerator<MetricEntry> {
    while (isPodActiveFn()) {
      await delay(intervalMs);
      const metric = await this.collectNext();
      if (metric) yield metric;
    }
  }

  private async collectNext(): Promise<MetricEntry | null> {
    const metrics = await this.makeQuerySafe();
    if (metrics.length === 0) {
      return null;
    }

    const [cpu, ram] =
      metrics[0].metric.prescott_metric === 'cpu' ? metrics : metrics.reverse();
    if (cpu === undefined || ram === undefined) {
      return null;
    }

    const timeSeconds = cpu.value[0]; // time of evaluation https://github.com/prometheus/prometheus/issues/5415
    const time = secondsToMilliseconds(timeSeconds);
    this.lastTime = time;

    return {
      time,
      ram: ram.value[1],
      cpu: cpu.value[1],
    };
  }

  private async makeQuerySafe(): Promise<K8sPodPrometheusMetric[]> {
    try {
      const query = this.buildQuery();
      const response = await fetch(this.queryUrl + `?query=${query}`);
      const body: K8sPodPrometheusMetricResponse = await response.json();
      if (body.status === 'error') {
        return [];
      }
      return body.data.result;
    } catch (err) {
      const reason = errorToReason(err);
      this.logger.error(`makeQuerySafe[ERROR]: ${reason}`);
      return [];
    }
  }

  private buildQuery(): string {
    const offset = this.buildOffset();
    return (
      `label_replace(` +
      `container_memory_usage_bytes${this.label}${offset},` +
      `'prescott_metric', 'ram', 'container_memory_usage_bytes', '(.*)'` +
      `)` +
      ` or ` +
      `label_replace(` +
      `container_cpu_usage_seconds_total${this.label}${offset},` +
      `'prescott_metric', 'cpu', 'container_cpu_usage_seconds_total', '(.*)'` +
      `)`
    );
  }

  private buildOffset() {
    return this.lastTime !== null
      ? ` offset ${Date.now() - this.lastTime}ms`
      : '';
  }
}
