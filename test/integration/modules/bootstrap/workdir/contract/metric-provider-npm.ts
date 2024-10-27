import { MetricProviderContract } from '@modules/contract/model/metric/metric-provider.contract';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';

export let metricProviderOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const metricProvider: MetricProviderContract = {
  init: async (opts: ContractInitOpts) => {
    metricProviderOpts = { ...opts.contract, ...opts.system };
  },
  consumeMetricGenerator: async (id, generator) => {},
  searchMetric: async (id, paging, dto) => ({
    next: 42,
    entries: [],
  }),
  aggregateMetric: async (runHandle, dto) => ({
    ram: { max: '1' },
    cpu: { avg: '42' },
  }),
  flushMetric: async (id) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => metricProvider,
} satisfies ContractModule;
