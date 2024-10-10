import { MetricEntry } from '@src/modules/contract/model/metric/metric-entry';

export type IsPodActiveFn = () => boolean;

export interface K8sPodMetricCollector {
  collect(
    intervalMs: number,
    isPodActive: IsPodActiveFn
  ): AsyncGenerator<MetricEntry>;
}
