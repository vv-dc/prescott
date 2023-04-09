import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';
import { ContractOpts } from '@modules/contract/model/contract';

export let metricParam = 0;

/* eslint-disable @typescript-eslint/no-unused-vars */
const metricProvider: MetricProviderContract = {
  init: async (opts) => {
    metricParam = (opts as ContractOpts).metricParam as number;
  },
  writeMetricBatch: async (id, entries) => {},
  writeMetric: async (id, entry) => {},
  consumeMetricGenerator: async (id, generator) => {},
  searchMetric: async (id, paging, dto) => ({
    next: 42,
    entries: [],
  }),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => metricProvider,
  getMetricParam: () => metricParam,
};
