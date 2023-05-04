import * as path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import * as readline from 'node:readline';
import {
  ensureDirectory,
  rmRecursiveSafe,
  waitStreamFinished,
} from '@lib/file.utils';
import { buildPaginator, PagingMatcherFn } from '@lib/paging.utils';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import {
  EntryPage,
  EntryPaging,
  EntrySearchDto,
} from '@modules/contract/model/entry-paging';
import { ContractOpts } from '@modules/contract/model/contract';
import {
  MetricAggregateDto,
  MetricProviderContract,
} from '@modules/contract/model/metric-provider.contract';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric-entry';
import { buildMetricEntryAccumulator } from '@src/workdir/contract/metric/metric-aggregate.utils';

const config = { workDir: '' };

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const buildMetricFilePath = (runHandle: TaskRunHandle): [string, string] => {
  const { taskId, runId } = runHandle;
  const dir = path.join(config.workDir, 'data', 'metric', taskId.toString());
  const metricPath = path.join(dir, `${runId}.json`);
  return [dir, metricPath];
};

const consumeMetricGenerator = async (
  runHandle: TaskRunHandle,
  metricGenerator: AsyncGenerator<MetricEntry>
): Promise<void> => {
  const [metricDir, metricPath] = buildMetricFilePath(runHandle);
  await ensureDirectory(metricDir);

  const writeStream = createWriteStream(metricPath);
  for await (const metricEntry of metricGenerator) {
    writeStream.write(JSON.stringify(metricEntry) + '\n');
  }
  writeStream.end();
  await waitStreamFinished(writeStream);
};

const buildMetricMatchersList = (
  dto: EntrySearchDto
): PagingMatcherFn<MetricEntry>[] => {
  const { toDate, fromDate } = dto;
  const matchers: PagingMatcherFn<MetricEntry>[] = [];
  if (fromDate) {
    matchers.push((entry) => entry.time >= fromDate.getTime());
  }
  if (toDate) {
    matchers.push((entry) => entry.time <= toDate.getTime());
  }
  return matchers;
};

const buildMetricMatcher = (
  dto: EntrySearchDto
): ((metricEntry: MetricEntry) => boolean) => {
  const checkers = buildMetricMatchersList(dto);
  return (metricEntry) => {
    for (const checker of checkers) {
      if (!checker(metricEntry)) return false;
    }
    return true;
  };
};

const getMetricLinesInterface = (
  runHandle: TaskRunHandle
): readline.Interface => {
  const [, metricPath] = buildMetricFilePath(runHandle);
  return readline.createInterface({
    input: createReadStream(metricPath),
    crlfDelay: Infinity,
  });
};

const searchMetric = async (
  runHandle: TaskRunHandle,
  dto: EntrySearchDto,
  paging: EntryPaging
): Promise<EntryPage<MetricEntry>> => {
  const isMatch = buildMetricMatcher(dto);
  const paginator = buildPaginator(isMatch, paging, 1_000);

  const linesReadable = getMetricLinesInterface(runHandle);
  for await (const line of linesReadable) {
    const metricEntry: MetricEntry = JSON.parse(line);
    const isDone = paginator.process(metricEntry);
    if (isDone) break;
  }

  return paginator.build();
};

const aggregateMetric = async (
  runHandle: TaskRunHandle,
  dto: MetricAggregateDto
): Promise<MetricsAggregated> => {
  const { apply, search } = dto;
  const metricAttributes = apply.split(',');
  const accumulator = buildMetricEntryAccumulator(metricAttributes);
  const isMatch = buildMetricMatcher(search);

  const linesReadable = getMetricLinesInterface(runHandle);
  for await (const line of linesReadable) {
    const metric: MetricEntry = JSON.parse(line);
    if (!isMatch(metric)) continue;
    accumulator.add(metric);
  }

  return accumulator.build();
};

const flushMetric = async (taskId: number): Promise<void> => {
  const [metricDir] = buildMetricFilePath({ taskId, runId: 0 });
  await rmRecursiveSafe(metricDir);
};

const fileMetricProvider: MetricProviderContract = {
  init,
  consumeMetricGenerator,
  searchMetric,
  aggregateMetric,
  flushMetric,
};

export default {
  buildContract: async () => fileMetricProvider,
};
