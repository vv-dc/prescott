import { randomInt } from 'node:crypto';

import {
  buildConfigResolverContract,
  buildContractSystemOpts,
  buildEnvContractResolver,
  buildResolvableContract,
  loadContract,
} from '@modules/contract/contract-loader';
import { generateRandomString } from '@lib/random.utils';
import {
  Contract,
  ContractInitOpts,
  ContractOpts,
} from '@modules/contract/model/contract';
import { ContractConfigFileEntry } from '@modules/contract/model/contract-config';
import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';
import {
  prepareMockResolverContract,
  prepareMockEnvBuilderContract,
  prepareMockEnvRunnerContract,
  mockContractImport,
  prepareContactSystemOpts,
} from '@test/lib/test-contract.utils';

describe('contract-loader unit', () => {
  describe('loadContract', () => {
    it('should build npm contract - CJS', async () => {
      const mockContract: Contract = {
        init: jest.fn(),
      };
      mockContractImport('some-random-contract-42', mockContract);

      const systemOpts = await buildContractSystemOpts(generateRandomString());
      const contract = await loadContract(
        'npm',
        'some-random-contract-42',
        systemOpts
      );
      expect(contract).toEqual(mockContract);
    });

    it('should throw if file contract extension is not supported', async () => {
      const fileKey = 'some-file.py';
      const systemOpts = await buildContractSystemOpts(generateRandomString());
      await expect(loadContract('file', fileKey, systemOpts)).rejects.toThrow(
        new Error(
          'Unable to load contract from file: unsupported extension: .py'
        )
      );
    });

    it('should throw if path is not within workDir', async () => {
      const fileKey = '../../something.js';
      const workDir = 'src/workdir';
      const systemOpts = await buildContractSystemOpts(workDir);
      await expect(loadContract('file', fileKey, systemOpts)).rejects.toThrow(
        Error
      );
    });

    it('should build file contract - ESM', async () => {
      const mockContract: Contract = {
        init: jest.fn(),
      };
      mockContractImport('src/contract/some-random-contract', mockContract);

      const systemOpts = await buildContractSystemOpts('src');
      const contract = await loadContract(
        'file',
        'some-random-contract.js',
        systemOpts
      );
      expect(contract).toEqual(mockContract);
    });
  });

  describe('buildConfigResolverContract', () => {
    it('should build "config" contract', async () => {
      const mockConfigResolverContract: ConfigResolverContract = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        init: jest.fn(async (opts) => {}),
        resolveValue: jest.fn((value) => value),
        resolveValueNullable: jest.fn((value) => value),
      };
      mockContractImport('some-contract-resolver', mockConfigResolverContract);

      const contractOpts: ContractOpts = {
        foo: generateRandomString(),
        another: generateRandomString(),
        bar42: generateRandomString(),
      };
      const configEntry: ContractConfigFileEntry = {
        type: 'npm',
        key: 'some-contract-resolver',
        opts: contractOpts,
      };
      const systemOpts = await buildContractSystemOpts(generateRandomString());

      const impl = await buildConfigResolverContract(configEntry, systemOpts);

      expect(impl).toStrictEqual(mockConfigResolverContract);
      expect(impl.init).toHaveBeenCalledWith({
        contract: contractOpts,
        system: systemOpts,
      } satisfies ContractInitOpts);
    });
  });

  describe('buildResolvableContract', () => {
    it('should build contract and resolve its variables', async () => {
      // prepare config resolver
      const RESOLVABLE_VARIABLES = {
        '{{FIRST_VARIABLE}}': generateRandomString(),
        '{{ANOTHER_42}}': generateRandomString(),
      } as Record<string, string | undefined>;
      const configResolver = prepareMockResolverContract(RESOLVABLE_VARIABLES);

      // mock contract that will be built
      const mockContract = prepareMockEnvBuilderContract();
      mockContractImport('some-env-builder', mockContract);

      const contractOpts: ContractOpts = {
        first: '{{FIRST_VARIABLE}}',
        directVar: randomInt(1, 1_000_000).toString(),
        abc123: '{{ANOTHER_42}}',
        somethingElse: generateRandomString(),
        FIRST_VARIABLE: generateRandomString(),
      };
      const configEntry: ContractConfigFileEntry = {
        type: 'npm',
        key: 'some-env-builder',
        opts: contractOpts,
      };
      const systemOpts = await buildContractSystemOpts(generateRandomString());

      // build contract
      const impl = await buildResolvableContract(
        'envBuilder',
        configEntry,
        configResolver,
        systemOpts
      );

      // check
      expect(impl).toStrictEqual(mockContract);
      expect(impl.init).toHaveBeenCalledWith({
        contract: {
          first: RESOLVABLE_VARIABLES['{{FIRST_VARIABLE}}'],
          directVar: contractOpts.directVar,
          abc123: RESOLVABLE_VARIABLES['{{ANOTHER_42}}'],
          somethingElse: contractOpts.somethingElse,
          FIRST_VARIABLE: contractOpts.FIRST_VARIABLE,
        },
        system: systemOpts,
      } satisfies ContractInitOpts);
      expect(configResolver.resolveValue).toHaveBeenCalledTimes(5); // for every opt
    });
  });

  describe('buildEnvContractResolver', () => {
    it('should throw if there are no builders', async () => {
      const configResolver = prepareMockResolverContract();
      const systemOpts = await prepareContactSystemOpts();
      await expect(
        buildEnvContractResolver(
          [],
          [
            {
              type: 'npm',
              key: 'some-runner-from-npm',
              name: 'runner-name-1',
              builder: 'builder-name-42',
            },
          ],
          configResolver,
          systemOpts
        )
      ).rejects.toThrow(
        new Error('At least one EnvBuilder should be provided')
      );
    });

    it('should throw if there are no runners', async () => {
      const mockEnvBuilder = prepareMockEnvBuilderContract();
      mockContractImport('some-env-builder-42', mockEnvBuilder);

      const configResolver = prepareMockResolverContract();
      const systemOpts = await prepareContactSystemOpts();
      await expect(
        buildEnvContractResolver(
          [
            {
              type: 'npm',
              key: 'some-env-builder-42',
              name: 'builder-name-123',
            },
          ],
          [],
          configResolver,
          systemOpts
        )
      ).rejects.toThrow(new Error('At least one EnvRunner should be provided'));
    });

    it('should throw if corresponding builder does not exist', async () => {
      const mockEnvBuilder = prepareMockEnvBuilderContract();
      mockContractImport('some-env-builder-42', mockEnvBuilder);

      const mockEnvRunner = prepareMockEnvRunnerContract();
      mockContractImport('some-env-runner', mockEnvRunner);

      const configResolver = prepareMockResolverContract();
      const systemOpts = await prepareContactSystemOpts();
      await expect(
        buildEnvContractResolver(
          [
            {
              type: 'npm',
              key: 'some-env-builder-42',
              name: 'builder-name-123',
            },
          ],
          [
            {
              type: 'npm',
              key: 'some-env-runner-42',
              name: 'some-env-runner',
              builder: 'some-non-existent-builder',
            },
          ],
          configResolver,
          systemOpts
        )
      ).rejects.toThrow(
        new Error(
          'Unable to resolve EnvBuilder[name=some-non-existent-builder] for EnvRunner[name=some-env-runner]'
        )
      );
    });

    it('should map builders and runners correctly', async () => {
      // 3 builders, but only 2 runners - 1 builder is not used

      // builders
      const mockEnvBuilder1 = prepareMockEnvBuilderContract();
      mockContractImport('env-builder-1', mockEnvBuilder1);

      const mockEnvBuilder2 = prepareMockEnvBuilderContract();
      mockContractImport('env-builder-2', mockEnvBuilder2);

      const mockEnvBuilder3 = prepareMockEnvBuilderContract();
      mockContractImport('env-builder-3', mockEnvBuilder3);

      // runners
      const mockEnvRunner1 = prepareMockEnvRunnerContract();
      mockContractImport('env-runner-1', mockEnvRunner1);

      const mockEnvRunner2 = prepareMockEnvRunnerContract();
      mockContractImport('env-runner-2', mockEnvRunner2);

      // run
      const configResolver = prepareMockResolverContract();
      const systemOpts = await prepareContactSystemOpts();
      const envResolver = await buildEnvContractResolver(
        [
          {
            type: 'npm',
            key: 'env-builder-1',
            name: 'env-builder-1',
          },
          {
            type: 'npm',
            key: 'env-builder-2',
            name: 'env-builder-2',
          },
          {
            type: 'npm',
            key: 'env-builder-3',
            name: 'env-builder-3',
          },
        ],
        [
          {
            type: 'npm',
            key: 'env-runner-1',
            name: 'env-runner-1',
            builder: 'env-builder-3',
          },
          {
            type: 'npm',
            key: 'env-runner-2',
            name: 'env-runner-2',
            builder: 'env-builder-1',
          },
        ],
        configResolver,
        systemOpts
      );

      // check
      const pair1 = [
        envResolver.getBuilder('env-runner-1'),
        envResolver.getRunner('env-runner-1'),
      ];
      expect(pair1).toEqual([mockEnvBuilder3, mockEnvRunner1]);

      const pair2 = [
        envResolver.getBuilder('env-runner-2'),
        envResolver.getRunner('env-runner-2'),
      ];
      expect(pair2).toEqual([mockEnvBuilder1, mockEnvRunner2]);
    });
  });
});
