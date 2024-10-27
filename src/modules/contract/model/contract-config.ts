import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { LogProviderContract } from '@modules/contract/model/log/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric/metric-provider.contract';
import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';
import { TaskQueueContract } from '@modules/contract/model/queue/task-queue.contract';
import { ContractOpts } from '@modules/contract/model/contract';

export type ContractConfigFile = Record<ContractType, ContractConfigFileEntry>;

export const CONTRACT_TYPES = [
  'config', // always loads first
  'envBuilder',
  'envRunner',
  'log',
  'metric',
  'scheduler',
  'queue',
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export type ResolvableContractType = Exclude<ContractType, 'config'>;

export interface ContractConfigFileEntry {
  type: ContractSourceType;
  key: string;
  opts?: ContractOpts;
}

export const CONTRACT_CONFIG_SOURCE_TYPES = ['file', 'npm'] as const;
export type ContractSourceType = (typeof CONTRACT_CONFIG_SOURCE_TYPES)[number];

export interface ContractMap {
  config: ConfigResolverContract;
  envBuilder: EnvBuilderContract;
  envRunner: EnvRunnerContract;
  log: LogProviderContract;
  metric: MetricProviderContract;
  scheduler: TaskSchedulerContract;
  queue: TaskQueueContract;
}
