import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { TaskRunId } from '@modules/contract/model/task-run-id';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { ContractOpts } from '@modules/contract/model/contract';
import {
  MetricProviderContract,
  MetricSearchDto,
} from '@modules/contract/model/metric-provider.contract';
import { MetricEntry } from '@modules/contract/model/metric-entry';

const config = {
  workDir: '',
};

/* eslint-disable @typescript-eslint/no-unused-vars */
const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const consumeMetricGenerator = async (
  id: TaskRunId,
  generator: AsyncGenerator<MetricEntry>
): Promise<void> => {
  // no-op
};

const writeMetric = async (
  id: TaskRunId,
  entry: MetricEntry
): Promise<void> => {
  const logPath = path.join(
    config.workDir,
    'data',
    'metric',
    `${id.runId}.json`
  );
  await fs.appendFile(logPath, JSON.stringify(entry) + '\n', 'utf-8');
};

const writeMetricBatch = async (
  id: TaskRunId,
  entries: MetricEntry[]
): Promise<void> => {
  //
};

const searchMetric = async (
  id: TaskRunId,
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
  buildContract: async () => metricProvider,
};
