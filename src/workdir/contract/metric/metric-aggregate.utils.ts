import {
  MetricEntry,
  MetricsAggregated,
  MetricValue,
} from '@modules/contract/model/metric-entry';

export interface MetricAggregator {
  add(value: number): void;
  build(): number;
}

const METRIC_AGGREGATORS = ['max', 'min', 'avg', 'cnt'] as const;
export type MetricAggregatorType = (typeof METRIC_AGGREGATORS)[number];

export interface MetricValueAccumulator {
  add(value: number): void;
  build(): MetricValue;
}

export interface MetricAccumulator {
  add(value: MetricEntry): void;
  build(): MetricsAggregated;
}

const buildMaxAggregator = (): MetricAggregator => {
  let currentMax = -Infinity;
  return {
    add: (value) => {
      currentMax = Math.max(currentMax, value);
    },
    build: () => currentMax,
  };
};

const buildMinAccumulator = (): MetricAggregator => {
  let currentMin = Infinity;
  return {
    add: (value) => {
      currentMin = Math.min(currentMin, +value);
    },
    build: () => currentMin,
  };
};

const buildAvgAggregator = (): MetricAggregator => {
  let [sum, counter] = [0, 0];
  return {
    add: (value) => {
      sum += +value;
      ++counter;
    },
    build: () => sum / counter,
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

const buildMetricAttributeAccumulator = (): MetricValueAccumulator => {
  const aggregatorsMap: Record<MetricAggregatorType, MetricAggregator> = {
    min: buildMinAccumulator(),
    max: buildMaxAggregator(),
    avg: buildAvgAggregator(),
    cnt: buildCountAggregator(),
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
          .toString();
      }
      return metricValue;
    },
  };
};

export const buildMetricAccumulator = (
  attributes: string[]
): MetricAccumulator => {
  const allAttributes = new Set([...attributes, 'ram', 'cpu']);
  const accumulatorsMap = {} as Record<string, MetricValueAccumulator>;
  for (const attribute of allAttributes) {
    accumulatorsMap[attribute] = buildMetricAttributeAccumulator();
  }

  return {
    add: (metric) => {
      for (const attribute of allAttributes) {
        const value = +metric[attribute];
        accumulatorsMap[attribute].add(value);
      }
    },
    build: () => {
      const aggregated = {} as MetricsAggregated;
      for (const attribute of allAttributes) {
        aggregated[attribute] = accumulatorsMap[attribute].build();
      }
      return aggregated;
    },
  };
};
