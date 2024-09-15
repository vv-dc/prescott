import { MetricProviderContract } from '@modules/contract/model/metric/metric-provider.contract';
import { ContractInitOpts } from '@modules/contract/model/contract';

export let metricParam = '';
export let metricWorkDir = '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const metricProvider: MetricProviderContract = {
  init: async (opts: ContractInitOpts) => {
    metricParam = opts.contract.metricParam ?? '';
    metricWorkDir = opts.system.workDir;
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
  getMetricParam: () => metricParam,
};
