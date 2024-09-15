import { randomInt } from 'node:crypto';
import {
  buildContract,
  buildContractSystemOpts,
} from '@modules/contract/contract-loader';
import { generateRandomString } from '@lib/random.utils';
import { ContractConfigFileEntry } from '@modules/contract/model/contract-config';
import { Contract, ContractModule } from '@modules/contract/model/contract';

describe('contract-loader unit', () => {
  describe('buildContract', () => {
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

      const configEntry: ContractConfigFileEntry = {
        type: 'npm',
        key: 'some-random-contract-42',
        opts: {
          foo: generateRandomString(),
          bar: randomInt(10_000).toString(),
        },
      };

      const systemOpts = await buildContractSystemOpts(generateRandomString());
      const contract = await buildContract(configEntry, systemOpts);
      expect(contract).toEqual(mockContract);
      expect(mockContract.init).toBeCalledWith({
        system: systemOpts,
        contract: configEntry.opts,
      });
    });

    it('should throw if file contract extension is not supported', async () => {
      const fileKey = 'some-file.py';
      const systemOpts = await buildContractSystemOpts(generateRandomString());
      await expect(
        buildContract(
          {
            type: 'file',
            key: fileKey,
          },
          systemOpts
        )
      ).rejects.toThrow(Error);
    });

    it('should throw if path is not within workDir', async () => {
      const fileKey = '../../something.js';
      const workDir = 'src/workdir';
      const systemOpts = await buildContractSystemOpts(workDir);
      await expect(
        buildContract({ type: 'file', key: fileKey }, systemOpts)
      ).rejects.toThrow(Error);
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

      const configEntry: ContractConfigFileEntry = {
        type: 'file',
        key: 'some-random-contract.js',
        opts: {
          foo: generateRandomString(),
          bar: randomInt(10_000).toString(),
        },
      };

      const systemOpts = await buildContractSystemOpts('src');
      const contract = await buildContract(configEntry, systemOpts);
      expect(contract).toEqual(mockContract);
      expect(mockContract.init).toBeCalledWith({
        system: systemOpts,
        contract: configEntry.opts,
      });
    });
  });
});
