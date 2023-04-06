import { randomInt } from 'node:crypto';
import { buildContract } from '@modules/contracts/contract-loader';
import { generateRandomString } from '@lib/random.utils';
import { ContractConfigEntry } from '@modules/contracts/model/contract-config';
import { Contract, ContractModule } from '@modules/contracts/model/contract';

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

      const configEntry: ContractConfigEntry = {
        type: 'npm',
        key: 'some-random-contract-42',
        opts: {
          foo: generateRandomString(),
          bar: randomInt(10_000),
        },
      };

      const contract = await buildContract(configEntry);
      expect(contract).toEqual(mockContract);
      expect(mockContract.init).toBeCalledWith(configEntry.opts);
    });

    it('should throw if file contract extension is not supported', async () => {
      const fileKey = 'some-file.py';
      await expect(
        buildContract({
          type: 'file',
          key: fileKey,
        })
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
        'some-random-contract.js',
        () => ({
          default: contractModule,
        }),
        {
          virtual: true,
        }
      );

      const configEntry: ContractConfigEntry = {
        type: 'file',
        key: 'some-random-contract.js',
        opts: {
          foo: generateRandomString(),
          bar: randomInt(10_000),
        },
      };

      const contract = await buildContract(configEntry);
      expect(contract).toEqual(mockContract);
      expect(mockContract.init).toBeCalledWith(configEntry.opts);
    });
  });
});
