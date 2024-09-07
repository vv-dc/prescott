import { Schema } from 'joi';
import { Contract } from '@modules/contract/model/contract';
import {
  ContractConfigFile,
  ContractType,
} from '@modules/contract/model/contract-config';
import { envBuilderSchema } from '@modules/contract/schema/env-builder.schema';
import { logProviderSchema } from '@modules/contract/schema/log-provider.schema';
import { metricProviderSchema } from '@modules/contract/schema/metric-provider.schema';
import { contractConfigSchema } from '@modules/contract/schema/contract-config.schema';
import { taskSchedulerSchema } from '@modules/contract/schema/task-scheduler.schema';
import { taskQueueSchema } from '@modules/contract/schema/task-queue.schema';
import { envRunnerSchema } from '@modules/contract/schema/env-runner.schema';

const contractSchema: Record<ContractType, Schema> = {
  envBuilder: envBuilderSchema,
  envRunner: envRunnerSchema,
  log: logProviderSchema,
  metric: metricProviderSchema,
  scheduler: taskSchedulerSchema,
  queue: taskQueueSchema,
};

export const validateContactImpl = (
  type: ContractType,
  impl: Contract
): string | null => {
  const schema = contractSchema[type];
  const { error } = schema.validate(impl);
  return error ? `Invalid implementation for ${type}: ${error}` : null;
};

export const validateContractConfig = (
  config: ContractConfigFile
): string | null => {
  const { error } = contractConfigSchema.validate(config);
  return error ? `Invalid config: ${error.message}` : null;
};
