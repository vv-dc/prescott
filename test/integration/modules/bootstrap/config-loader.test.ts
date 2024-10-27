import * as path from 'node:path';
import { getRootConfig } from '@modules/bootstrap/config-loader';
import { ContractMap } from '@modules/contract/model/contract-config';
import envBuilderFileContract, {
  envBuilderOpts,
} from '@test/integration/modules/bootstrap/workdir/contract/env-builder-file';
import envRunnerFileContract, {
  envRunnerOpts,
} from '@test/integration/modules/bootstrap/workdir/contract/env-runner-file';
import metricNpmContract, {
  metricProviderOpts,
} from '@test/integration/modules/bootstrap/workdir/contract/metric-provider-npm';
import logDefaultContract, {
  logProviderOpts,
} from '@test/integration/modules/bootstrap/workdir/contract/log-provider-file';
import schedulerDefaultContract, {
  taskSchedulerOpts,
} from '@test/integration/modules/bootstrap/workdir/contract/task-scheduler-file';
import queueDefaultContract, {
  taskQueueOpts,
} from '@test/integration/modules/bootstrap/workdir/contract/task-queue-npm';
import configDefaultContract, {
  configResolverOpts,
  PREDEFINED_VARIABLES_MAP,
} from '@test/integration/modules/bootstrap/workdir/contract/config-resolver-file';
import taskQueueNpm from '@test/integration/modules/bootstrap/workdir/contract/task-queue-npm';

describe('config-loader integration', () => {
  it('should throw if config is not complete', async () => {
    const workdir = path.join(__dirname, 'partial-workdir');
    await expect(getRootConfig(workdir)).rejects.toThrow(
      new Error('Invalid root config: "contract.envBuilder" is required')
    );
  });

  it('should bootstrap application by root config and resolve variables', async () => {
    jest.mock('metric-provider-npm', () => metricNpmContract, {
      virtual: true,
    });
    jest.mock('task-queue-npm', () => taskQueueNpm, {
      virtual: true,
    });

    const workDir = path.join(__dirname, 'workdir');
    const rootConfig = await getRootConfig(workDir);

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

    expect(configResolverOpts).toStrictEqual({
      configNotResolved: '{{CONFIG_RESOLVER_VAR}}',
      configRaw: 'foo-bar-42',
      workDir,
    });
    expect(envBuilderOpts).toStrictEqual({
      resolved: PREDEFINED_VARIABLES_MAP['{{ENV_BUILDER_VAR}}'],
      raw: '-3',
      workDir,
    });
    expect(envRunnerOpts).toStrictEqual({
      envParam: '-42',
      workDir,
    });
    expect(logProviderOpts).toStrictEqual({
      someValue: PREDEFINED_VARIABLES_MAP['{{LOG_PROVIDER_VAR}}'],
      workDir,
    });
    expect(metricProviderOpts).toStrictEqual({
      metricParam: '424242',
      workDir,
    });
    expect(taskSchedulerOpts).toStrictEqual({
      someVar: PREDEFINED_VARIABLES_MAP['{{SCHEDULER_VAR}}'],
      workDir,
    });
    expect(taskQueueOpts).toStrictEqual({
      workDir,
    });
  });
});
