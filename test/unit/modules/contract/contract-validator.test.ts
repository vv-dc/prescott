import {
  assertConfigIncludesAllTypes,
  validateContactImpl,
} from '@modules/contracts/contract-validator';
import { generateRandomString } from '@lib/random.utils';
import { Contract } from '@modules/contracts/model/contract';
import { EnvProviderContract } from '@modules/contracts/model/env-provider.contract';
import { EnvHandle } from '@modules/contracts/model/env-handle';
import { LogProviderContract } from '@modules/contracts/model/log-provider.contract';
import { MetricProviderContract } from '@modules/contracts/model/metric-provider.contract';
import { EntryPage } from '@modules/contracts/model/entry-paging';
import { MetricEntry } from '@modules/contracts/model/metric-entry';
import { ContractConfig } from '@modules/contracts/model/contract-config';

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

  it('should validate config keys - INVALID', () => {
    expect(() => {
      assertConfigIncludesAllTypes({
        env: {},
      } as ContractConfig);
    }).toThrow(Error);
  });

  it('should validate config keys - VALID', () => {
    expect(() => {
      assertConfigIncludesAllTypes({
        env: {},
        log: {},
        metric: {},
      } as ContractConfig);
    }).not.toThrow();
  });
});
