import * as Joi from 'joi';
import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';

export const metricProviderSchema = Joi.object<MetricProviderContract>({
  init: Joi.function().minArity(1).required(),
  consumeMetricGenerator: Joi.function().minArity(2).required(),
  searchMetric: Joi.function().minArity(3).required(),
  flushMetric: Joi.function().minArity(1).required(),
});
