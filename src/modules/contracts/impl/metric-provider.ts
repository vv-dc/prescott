import { TaskInstanceId } from '@modules/contracts/model/task-instance-id';
import { EntryPage, EntryPaging } from '@modules/contracts/model/entry-paging';
import { ContractOpts } from '@modules/contracts/model/contract';
import {
  MetricProviderContract,
  MetricSearchDto,
} from '@modules/contracts/model/metric-provider.contract';
import { MetricEntry } from '@modules/contracts/model/metric-entry';

/* eslint-disable @typescript-eslint/no-unused-vars */
const init = async (opts?: ContractOpts): Promise<void> => {
  //
};

const consumeMetricGenerator = async (
  id: TaskInstanceId,
  generator: AsyncGenerator<MetricEntry>
): Promise<void> => {
  // no-op
};

const writeMetric = async (
  id: TaskInstanceId,
  entry: MetricEntry
): Promise<void> => {
  //
};

const writeMetricBatch = async (
  id: TaskInstanceId,
  entries: MetricEntry[]
): Promise<void> => {
  //
};

const searchMetric = async (
  id: TaskInstanceId,
  paging: EntryPaging,
  dto: MetricSearchDto
): Promise<EntryPage<MetricEntry>> => {
  return {
    entries: [],
    next: 42,
  };
};

const metricProvider: MetricProviderContract = {
  init,
  consumeMetricGenerator,
  writeMetric,
  writeMetricBatch,
  searchMetric,
};

export default {
  buildContract: () => metricProvider,
};
