import {
  MetricEntry,
  MetricsAggregated,
  MetricValue,
} from '@modules/contract/model/metric/metric-entry';

export interface MetricAggregator {
  add(value: number): void;
  build(): number;
}

const METRIC_AGGREGATORS = ['max', 'min', 'avg', 'cnt', 'std'] as const;
export type MetricAggregatorType = (typeof METRIC_AGGREGATORS)[number];

export interface MetricValueAccumulator {
  add(value: number): void;
  build(): MetricValue;
}

export interface MetricEntryAccumulator {
  add(value: MetricEntry): void;
  build(): MetricsAggregated;
}

const buildMaxAggregator = (): MetricAggregator => {
  let currentMax = -Infinity;
  return {
    add: (value) => {
      currentMax = Math.max(currentMax, value);
    },
    build: () => (currentMax > -Infinity ? currentMax : 0),
  };
};

const buildMinAccumulator = (): MetricAggregator => {
  let currentMin = Infinity;
  return {
    add: (value) => {
      currentMin = Math.min(currentMin, +value);
    },
    build: () => (currentMin < Infinity ? currentMin : 0),
  };
};

const buildAvgAggregator = (): MetricAggregator => {
  let [sum, counter] = [0, 0];
  return {
    add: (value) => {
      sum += value;
      ++counter;
    },
    build: () => (counter === 0 ? 0 : sum / counter),
  };
};

const buildCountAggregator = (): MetricAggregator => {
  let counter = 0;
  return {
    add: () => {
      ++counter;
    },
    build: () => counter,
  };
};

const buildStdAggregator = (): MetricAggregator => {
  const values: number[] = [];
  return {
    add: (value) => {
      values.push(value);
    },
    build: () => {
      if (values.length === 0) return 0;
      const avg = values.reduce((acc, val) => acc + val) / values.length;
      const sqrSum = values.reduce((acc, val) => acc + (val - avg) ** 2, 0);
      return Math.sqrt(sqrSum / values.length);
    },
  };
};

const buildMetricAttributeAccumulator = (): MetricValueAccumulator => {
  const aggregatorsMap: Record<MetricAggregatorType, MetricAggregator> = {
    min: buildMinAccumulator(),
    max: buildMaxAggregator(),
    avg: buildAvgAggregator(),
    cnt: buildCountAggregator(),
    std: buildStdAggregator(),
  };
  return {
    add: (value) => {
      for (const aggregatorType of METRIC_AGGREGATORS) {
        aggregatorsMap[aggregatorType].add(value);
      }
    },
    build: (): MetricValue => {
      const metricValue: MetricValue = {};
      for (const aggregatorType of METRIC_AGGREGATORS) {
        metricValue[aggregatorType] = aggregatorsMap[aggregatorType]
          .build()
          .toFixed(3);
      }
      return metricValue;
    },
  };
};

export const buildMetricEntryAccumulator = (
  attributes: string[]
): MetricEntryAccumulator => {
  const uniqueAttributes = new Set(attributes);
  const accumulatorsMap = {} as Record<string, MetricValueAccumulator>;
  for (const attribute of uniqueAttributes) {
    accumulatorsMap[attribute] = buildMetricAttributeAccumulator();
  }

  return {
    add: (metric) => {
      for (const attribute of uniqueAttributes) {
        if (metric[attribute] === undefined) continue;
        const value = +metric[attribute];
        accumulatorsMap[attribute].add(value);
      }
    },
    build: () => {
      const aggregated = {} as MetricsAggregated;
      for (const attribute of uniqueAttributes) {
        aggregated[attribute] = accumulatorsMap[attribute].build();
      }
      return aggregated;
    },
  };
};
