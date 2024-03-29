import * as path from 'node:path';
import { getRootConfig } from '@modules/bootstrap/config-loader';
import { ContractMap } from '@modules/contract/model/contract-config';
import envFileContract from '@test/integration/modules/bootstrap/workdir/contract/custom-env-file-provider';
import metricNpmContract from '@test/integration/modules/bootstrap/workdir/contract/custom-metric-npm-provider';
import logDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/log-provider';
import schedulerDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/task-scheduler';
import queueDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/task-queue';

describe('config-loader integration', () => {
  it('should bootstrap application by root config file', async () => {
    jest.mock('custom-metric-npm-provider', () => metricNpmContract, {
      virtual: true,
    });

    const workdir = path.join(__dirname, 'workdir');
    const rootConfig = await getRootConfig(workdir);

    expect(rootConfig).toHaveProperty('contractMap');
    expect(rootConfig.contractMap).toStrictEqual({
      env: await envFileContract.buildContract(), // custom 'file'
      log: await logDefaultContract.buildContract(), // default
      metric: await metricNpmContract.buildContract(), // custom 'npm'
      scheduler: await schedulerDefaultContract.buildContract(), // default
      queue: await queueDefaultContract.buildContract(), // default
    } as ContractMap);

    expect(envFileContract.getEnvParam()).toEqual(-3);
    expect(metricNpmContract.getMetricParam()).toEqual(424242);
  });
});
