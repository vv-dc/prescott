import { randomInt } from 'node:crypto';
import { buildContract } from '@modules/contract/contract-loader';
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
          bar: randomInt(10_000),
        },
      };

      const contract = await buildContract(configEntry, generateRandomString());
      expect(contract).toEqual(mockContract);
      expect(mockContract.init).toBeCalledWith({
        workDir: expect.any(String),
        ...configEntry.opts,
      });
    });

    it('should throw if file contract extension is not supported', async () => {
      const fileKey = 'some-file.py';
      await expect(
        buildContract(
          {
            type: 'file',
            key: fileKey,
          },
          generateRandomString()
        )
      ).rejects.toThrow(Error);
    });

    it('should throw if path is not within workDir', async () => {
      const fileKey = '../../something.js';
      const workDir = 'src/workdir';
      await expect(
        buildContract({ type: 'file', key: fileKey }, workDir)
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
          bar: randomInt(10_000),
        },
      };

      const contract = await buildContract(configEntry, 'src');
      expect(contract).toEqual(mockContract);
      expect(mockContract.init).toBeCalledWith({
        workDir: expect.any(String),
        ...configEntry.opts,
      });
    });
  });
});
