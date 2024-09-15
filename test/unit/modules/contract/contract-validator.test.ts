import {
  validateContactImpl,
  validateContractConfig,
} from '@modules/contract/contract-validator';
import { generateRandomString } from '@lib/random.utils';
import { Contract } from '@modules/contract/model/contract';
import { LogProviderContract } from '@modules/contract/model/log/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric/metric-provider.contract';
import { EntryPage } from '@modules/contract/model/entry-paging';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric/metric-entry';
import { ContractConfigFile } from '@modules/contract/model/contract-config';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { EnvId } from '@modules/contract/model/env/env-id';

describe('contract-validator unit', () => {
  it('should validate envBuilder - INVALID', () => {
    const invalidEnvImpl: Contract = {
      init: async () => {},
    };
    const error = validateContactImpl('envBuilder', invalidEnvImpl);
    expect(error).not.toBeNull();
  });

  it('should validate envBuilder - VALID', () => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const envBuilderImpl: EnvBuilderContract = {
      init: async (opts) => {},
      buildEnv: async (dto) => generateRandomString(),
      deleteEnv: async (dto) => {},
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const error = validateContactImpl('envBuilder', envBuilderImpl);
    expect(error).toBeNull();
  });

  it('should validate envRunner - INVALID', () => {
    const invalidEnvImpl: Contract = {
      init: async () => {},
    };
    const error = validateContactImpl('envRunner', invalidEnvImpl);
    expect(error).not.toBeNull();
  });

  it('should validate envRunner - VALID', () => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const envBuilderImpl: EnvRunnerContract = {
      init: async (opts) => {},
      runEnv: async (dto) => ({} as EnvHandle),
      getEnvHandle: async (dto) => ({} as EnvHandle),
      getEnvChildrenHandleIds: async (envId: EnvId) => [generateRandomString()],
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const error = validateContactImpl('envRunner', envBuilderImpl);
    expect(error).toBeNull();
  });

  it('should validate log - INVALID', () => {
    const invalidLogImpl: Contract = {
      init: async () => {},
    };
    const error = validateContactImpl('log', invalidLogImpl);
    expect(error).not.toBeNull();
  });

  it('should validate log - VALID', () => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const logImpl: LogProviderContract = {
      init: async (opts) => {},
      consumeLogGenerator: async (id, generator) => {},
      searchLog: async (id, paging, dto) => ({
        next: 42,
        entries: [],
      }),
      flushLog: async (id) => {},
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const error = validateContactImpl('log', logImpl);
    expect(error).toBeNull();
  });

  it('should validate metric - INVALID', () => {
    const invalidMetricImpl: Contract = {
      init: async () => {},
    };
    const error = validateContactImpl('metric', invalidMetricImpl);
    expect(error).not.toBeNull();
  });

  it('should validate metric - VALID', () => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const metricImpl: MetricProviderContract = {
      init: async (opts) => {},
      consumeMetricGenerator: async (id, generator) => {},
      aggregateMetric: async (id, dto) => ({} as MetricsAggregated),
      searchMetric: async (id, paging, dto) => ({} as EntryPage<MetricEntry>),
      flushMetric: async (id) => {},
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const error = validateContactImpl('metric', metricImpl);
    expect(error).toBeNull();
  });

  it('should validate config - VALID', () => {
    const config: ContractConfigFile = {
      config: {
        type: 'file',
        key: 'some-config-provider-contract-impl',
      },
      envBuilder: {
        type: 'npm',
        key: 'some-env-builder-contract-impl',
        opts: { envParam: generateRandomString('env') },
      },
      envRunner: {
        type: 'npm',
        key: 'some-env-runner-contract-impl',
        opts: { envParam: generateRandomString('env') },
      },
      log: {
        type: 'file',
        key: '/home/someone/some-log-contract-impl.js',
        opts: { logParam: generateRandomString('log') },
      },
      metric: {
        type: 'npm',
        key: 'some-metric-contract-impl',
        opts: { metricParam: generateRandomString('metric') },
      },
      scheduler: {
        type: 'npm',
        key: 'some-scheduler-contract-impl',
        opts: { schedulerParam: generateRandomString('scheduler') },
      },
      queue: {
        type: 'npm',
        key: 'some-queue-contract-impl',
        opts: { queueParam: generateRandomString('queue') },
      },
    };
    const error = validateContractConfig(config);
    expect(error).toBeNull();
  });

  it('should validate config - INVALID', () => {
    const config = {
      env: {
        type: 'some',
        key: 'some-env-contract-impl',
        opts: { envParam: generateRandomString('env') },
      },
    } as unknown as ContractConfigFile;
    const error = validateContractConfig(config);
    expect(error).not.toBeNull();
  });
});
