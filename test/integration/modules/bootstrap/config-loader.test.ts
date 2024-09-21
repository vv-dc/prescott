import * as path from 'node:path';
import { getRootConfig } from '@modules/bootstrap/config-loader';
import { ContractMap } from '@modules/contract/model/contract-config';
import envBuilderFileContract from '@test/integration/modules/bootstrap/workdir/contract/env-builder-file';
import envRunnerFileContract from '@test/integration/modules/bootstrap/workdir/contract/env-runner-file';
import metricNpmContract from '@test/integration/modules/bootstrap/workdir/contract/metric-provider-npm';
import logDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/log-provider-file';
import schedulerDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/task-scheduler-file';
import queueDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/task-queue-npm';
import configDefaultContract from '@test/integration/modules/bootstrap/workdir/contract/config-provider-file';
import taskQueueNpm from '@test/integration/modules/bootstrap/workdir/contract/task-queue-npm';

describe('config-loader integration', () => {
  it('should throw if config is not complete', async () => {
    const workdir = path.join(__dirname, 'partial-workdir');
    await expect(getRootConfig(workdir)).rejects.toThrow(
      new Error('Invalid root config: "contract.envBuilder" is required')
    );
  });

  it('should bootstrap application by root config', async () => {
    jest.mock('metric-provider-npm', () => metricNpmContract, {
      virtual: true,
    });
    jest.mock('task-queue-npm', () => taskQueueNpm, {
      virtual: true,
    });

    const workdir = path.join(__dirname, 'workdir');
    const rootConfig = await getRootConfig(workdir);

    expect(rootConfig).toHaveProperty('contractMap');
    expect(rootConfig.contractMap).toStrictEqual({
      config: await configDefaultContract.buildContract(), // custom 'npm'
      envBuilder: await envBuilderFileContract.buildContract(), // custom 'file'
      envRunner: await envRunnerFileContract.buildContract(), // custom 'file
      log: await logDefaultContract.buildContract(), // default
      metric: await metricNpmContract.buildContract(), // custom 'npm'
      scheduler: await schedulerDefaultContract.buildContract(), // default
      queue: await queueDefaultContract.buildContract(), // default
    } as ContractMap);

    expect(envBuilderFileContract.getEnvParam()).toEqual('-3');
    expect(envRunnerFileContract.getEnvParam()).toEqual('-42');
    expect(metricNpmContract.getMetricParam()).toEqual('424242');
  });
});
