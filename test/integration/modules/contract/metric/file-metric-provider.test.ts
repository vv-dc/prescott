import { randomInt } from 'node:crypto';
import fileMetricProviderBuilder from '@src/workdir/contract/metric/file-metric-provider';
import { generateTaskRunHandle } from '@test/lib/test-data.utils';
import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric-entry';

const buildMetricProvider = async (): Promise<MetricProviderContract> => {
  const metricProvider = await fileMetricProviderBuilder.buildContract();
  await metricProvider.init({ workDir: __dirname });
  return metricProvider;
};

describe('file-metric-provider integration', () => {
  it('save and then return metrics', async () => {
    const metricProvider = await buildMetricProvider();
    const generatedMetrics: MetricEntry[] = [];

    const metricGenerator = async function* (): AsyncGenerator<MetricEntry> {
      for (let idx = 0; idx < 100; ++idx) {
        const metricEntry: MetricEntry = {
          time: new Date().getTime(),
          cpu: (randomInt(1, 1000) / 1000).toFixed(2),
          ram: randomInt(1_000, 1_000_000).toFixed(2),
        };
        generatedMetrics.push(metricEntry);
        yield metricEntry;
      }
    };

    const runHandle = generateTaskRunHandle();
    await metricProvider.consumeMetricGenerator(runHandle, metricGenerator());

    const { next, entries } = await metricProvider.searchMetric(
      runHandle,
      {},
      { pageSize: generatedMetrics.length }
    );
    expect(entries).toHaveLength(generatedMetrics.length);
    expect(entries).toEqual(expect.arrayContaining(generatedMetrics));
    expect(next).toEqual(generatedMetrics.length + 1);

    await metricProvider.flushMetric(runHandle.taskId);
  });

  it('should search metrics by date', async () => {
    const metricProvider = await buildMetricProvider();
    const generatedMetrics: MetricEntry[] = [];

    const generator = async function* (): AsyncGenerator<MetricEntry> {
      for (let idx = 0; idx < 30; ++idx) {
        const metricEntry: MetricEntry = {
          cpu: (randomInt(1, 1000) / 1000).toFixed(2),
          ram: randomInt(1_000, 1_000_000).toFixed(2),
          time: new Date(
            `2023-01-${(idx + 1).toString().padStart(2, '0')}`
          ).getTime(),
        };
        generatedMetrics.push(metricEntry);
        yield metricEntry;
      }
    };

    const runHandle = generateTaskRunHandle();
    await metricProvider.consumeMetricGenerator(runHandle, generator());

    const { entries, next } = await metricProvider.searchMetric(
      runHandle,
      {
        fromDate: new Date('2023-01-13'),
        toDate: new Date('2023-01-30'),
      },
      { pageSize: 8, from: 3 }
    );
    expect(entries).toHaveLength(8);
    expect(entries).toEqual(generatedMetrics.slice(15, 23));
    expect(next).toEqual(12);

    await metricProvider.flushMetric(runHandle.taskId);
  });

  it('should aggregate metrics', async () => {
    const metricProvider = await buildMetricProvider();

    const metricGenerator = async function* (): AsyncGenerator<MetricEntry> {
      for (let idx = 0; idx < 100; ++idx) {
        const metricEntry: MetricEntry = {
          time: new Date().getTime(),
          cpu: idx.toFixed(2),
          ram: (idx + 1).toFixed(2),
          foo: randomInt(1, 1_000_000), // should not be included
        };
        if (idx % 2 === 1) {
          metricEntry.smth = (idx + 2).toFixed(2);
        }
        yield metricEntry;
      }
    };

    const runHandle = generateTaskRunHandle();
    await metricProvider.consumeMetricGenerator(runHandle, metricGenerator());

    const aggregated = await metricProvider.aggregateMetric(runHandle, {
      search: {},
      apply: 'ram,cpu,smth,smthelse',
    });
    expect(aggregated).toStrictEqual({
      ram: {
        min: '1.000',
        max: '100.000',
        cnt: '100.000',
        avg: '50.500',
        std: '28.866',
      },
      cpu: {
        min: '0.000',
        max: '99.000',
        cnt: '100.000',
        avg: '49.500',
        std: '28.866',
      },
      smth: {
        min: '3.000',
        max: '101.000',
        cnt: '50.000',
        avg: '52.000',
        std: '28.862',
      },
      smthelse: {
        min: '0.000',
        max: '0.000',
        cnt: '0.000',
        avg: '0.000',
        std: '0.000',
      },
    } as MetricsAggregated);

    await metricProvider.flushMetric(runHandle.taskId);
  });
});
