import { validateRootConfigFile } from '@modules/bootstrap/config-validator';
import { RootConfigFile } from '@modules/bootstrap/model/root-config';

const baseRootConfig: RootConfigFile = {
  contract: {
    config: {
      type: 'file',
      key: 'config.ts',
      opts: {
        a: '1',
      },
    },
    envRunner: {
      type: 'file',
      key: 'env-runner.ts',
      opts: {
        envRunnerParam: '2',
      },
    },
    envBuilder: {
      type: 'file',
      key: 'env-builder.ts',
      opts: {
        envBuilderParam: '3',
      },
    },
    log: {
      type: 'file',
      key: 'log.ts',
      opts: {
        logParam: '4',
      },
    },
    metric: {
      type: 'file',
      key: 'metric.ts',
      opts: {
        metricParam: '5',
      },
    },
    scheduler: {
      type: 'file',
      key: 'scheduler.ts',
      opts: {
        schedulerParam: '6',
      },
    },
    queue: {
      type: 'file',
      key: 'queue.ts',
      opts: {
        queueParam: '7',
      },
    },
  },
};

describe('config-validator', () => {
  describe('validateRootConfigFile', () => {
    it('should return null for valid config', () => {
      const error = validateRootConfigFile(baseRootConfig);
      expect(error).toBeNull();
    });

    it('should return error for non-string contract opts', () => {
      const config = {
        ...baseRootConfig,
        contract: {
          ...baseRootConfig.contract,
          envBuilder: {
            ...baseRootConfig.contract.envBuilder,
            opts: {
              numericOpt: 42,
            },
          },
        },
      } as unknown as RootConfigFile;

      const error = validateRootConfigFile(config);
      expect(error).toEqual(
        `Invalid root config: "contract.envBuilder.opts.numericOpt" must be a string`
      );
    });

    it('should return error if contract is absent', () => {
      const config = {
        ...baseRootConfig,
        contract: {
          ...baseRootConfig.contract,
          envBuilder: undefined,
        },
      } as unknown as RootConfigFile;

      const error = validateRootConfigFile(config);
      expect(error).toEqual(
        `Invalid root config: "contract.envBuilder" is required`
      );
    });
  });
});
