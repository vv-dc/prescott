import { randomInt } from 'node:crypto';

import {
  buildConfigResolverContract,
  buildContractSystemOpts,
  buildResolvableContract,
  loadContract,
} from '@modules/contract/contract-loader';
import { generateRandomString } from '@lib/random.utils';
import {
  Contract,
  ContractInitOpts,
  ContractModule,
  ContractOpts,
} from '@modules/contract/model/contract';
import { ContractConfigFileEntry } from '@modules/contract/model/contract-config';
import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';

describe('contract-loader unit', () => {
  describe('loadContract', () => {
    it('should build npm contract - CJS', async () => {
      const mockContract: Contract = {
        init: jest.fn(),
      };
      const contractModule: ContractModule = {
        buildContract: async (): Promise<Contract> => mockContract,
      };

      jest.mock('some-random-contract-42', () => contractModule, {
        virtual: true,
      });

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
      const contractModule: ContractModule = {
        buildContract: async (): Promise<Contract> => mockContract,
      };
      jest.mock(
        'src/contract/some-random-contract',
        () => ({
          default: contractModule,
        }),
        {
          virtual: true,
        }
      );

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
      const mockContractModule: ContractModule = {
        buildContract: async () => mockConfigResolverContract,
      };
      jest.mock(
        'some-contract-resolver',
        () => ({ default: mockContractModule }),
        { virtual: true }
      );

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
      const resolveValueMock = jest.fn((value: string) => {
        return RESOLVABLE_VARIABLES[value] ?? value;
      });
      const configResolver: ConfigResolverContract = {
        init: async () => {},
        resolveValue: resolveValueMock,
        resolveValueNullable: resolveValueMock,
      };

      // mock contract that will be built
      const mockContract: EnvBuilderContract = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        init: jest.fn(async (opts) => {}),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        buildEnv: async (dto) => generateRandomString(),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        deleteEnv: async (dto) => {},
      };
      const mockContractModule: ContractModule = {
        buildContract: async () => mockContract,
      };
      jest.mock('some-env-builder', () => ({ default: mockContractModule }), {
        virtual: true,
      });
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
});
