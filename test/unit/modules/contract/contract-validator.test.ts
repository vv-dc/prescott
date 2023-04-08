import {
  validateContactImpl,
  validateContractConfig,
} from '@modules/contracts/contract-validator';
import { generateRandomString } from '@lib/random.utils';
import { Contract } from '@modules/contracts/model/contract';
import { EnvProviderContract } from '@modules/contracts/model/env-provider.contract';
import { EnvHandle } from '@modules/contracts/model/env-handle';
import { LogProviderContract } from '@modules/contracts/model/log-provider.contract';
import { MetricProviderContract } from '@modules/contracts/model/metric-provider.contract';
import { EntryPage } from '@modules/contracts/model/entry-paging';
import { MetricEntry } from '@modules/contracts/model/metric-entry';
import { ContractConfigFile } from '@modules/contracts/model/contract-config';

describe('contract-validator unit', () => {
  it('should validate env - INVALID', () => {
    const invalidEnvImpl: Contract = {
      init: async () => {},
    };
    const error = validateContactImpl('env', invalidEnvImpl);
    expect(error).not.toBeNull();
  });

  it('should validate env - VALID', () => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const envImpl: EnvProviderContract = {
      init: async (opts) => {},
      runEnv: async (dto) => ({} as EnvHandle),
      compileEnv: async (dto) => generateRandomString(),
      deleteEnv: async (dto) => {},
      deleteEnvHierarchical: async (dto) => {},
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const error = validateContactImpl('env', envImpl);
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
      writeLog: async (id, entry) => {},
      writeLogBatch: async (id, entries) => {},
      searchLog: async (id, paging, dto) => {},
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
      writeMetric: async (id, entry) => {},
      writeMetricBatch: async (id, entries) => {},
      searchMetric: async (id, paging, dto) => ({} as EntryPage<MetricEntry>),
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const error = validateContactImpl('metric', metricImpl);
    expect(error).toBeNull();
  });

  it('should validate config - VALID', () => {
    const config: ContractConfigFile = {
      env: {
        type: 'npm',
        key: 'some-env-contract-impl',
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
