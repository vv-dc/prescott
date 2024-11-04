import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { LogProviderContract } from '@modules/contract/model/log/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric/metric-provider.contract';
import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';
import { TaskQueueContract } from '@modules/contract/model/queue/task-queue.contract';
import { ContractOpts } from '@modules/contract/model/contract';

export const CONTRACT_TYPES = [
  'config', // always loads first
  'envBuilder',
  'envRunner',
  'log',
  'metric',
  'scheduler',
  'queue',
] as const;

export interface ContractConfigFile {
  config: ContractConfigFileEntry;
  envBuilder: EnvBuilderContractConfigFileEntry[];
  envRunner: EnvRunnerContractConfigFileEntry[];
  log: ContractConfigFileEntry;
  metric: ContractConfigFileEntry;
  scheduler: ContractConfigFileEntry;
  queue: ContractConfigFileEntry;
}

export type ContractType = (typeof CONTRACT_TYPES)[number];

export type ResolvableContractType = Exclude<ContractType, 'config'>;

export interface ContractConfigFileEntry {
  type: ContractSourceType;
  key: string;
  opts?: ContractOpts;
}

export interface EnvRunnerContractConfigFileEntry
  extends ContractConfigFileEntry {
  name: string;
  builder: string;
}

export interface EnvBuilderContractConfigFileEntry
  extends ContractConfigFileEntry {
  name: string;
}

export const CONTRACT_CONFIG_SOURCE_TYPES = ['file', 'npm'] as const;
export type ContractSourceType = (typeof CONTRACT_CONFIG_SOURCE_TYPES)[number];

export interface EnvContractResolver {
  checkRunnerExists(runnerName: string): boolean;
  getRunner(runnerName: string | null): EnvRunnerContract;
  getBuilder(runnerName: string | null): EnvBuilderContract;
}

export interface ContractMap {
  config: ConfigResolverContract;
  env: EnvContractResolver;
  log: LogProviderContract;
  metric: MetricProviderContract;
  scheduler: TaskSchedulerContract;
  queue: TaskQueueContract;
}
