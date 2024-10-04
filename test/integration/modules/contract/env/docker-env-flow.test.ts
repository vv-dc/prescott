import { asyncGeneratorToArray } from '@lib/async.utils';
import { DOCKER_IMAGES, OUT_OF_MEMORY_CODE } from '@test/lib/test.const';
import envBuilderFn from '@src/workdir/contract/env/docker/docker-env-builder';
import envRunnerFn from '@src/workdir/contract/env/docker/docker-env-runner';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import {
  buildDockerImage,
  inspectDockerContainer,
  isDockerResourceExist,
} from '@src/workdir/contract/env/docker/docker.utils';
import { generateRandomString } from '@lib/random.utils';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import {
  BuildEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import {
  EnvRunnerContract,
  RunEnvDto,
} from '@modules/contract/model/env/env-runner.contract';
import { prepareContract } from '@test/lib/test-contract.utils';

const buildEnvBuilder = (): Promise<EnvBuilderContract> => {
  return prepareContract(envBuilderFn);
};

const buildEnvRunner = (): Promise<EnvRunnerContract> => {
  return prepareContract(envRunnerFn);
};

describe('docker-env-provider integration', () => {
  it('should handle life cycle of env from CREATE to DELETE', async () => {
    // build image => check it exists
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const buildDto: BuildEnvDto = {
      label: generateRandomString('build-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `while true; do echo "'hello'" && echo '"hello"'; sleep 1000; done`,
      isCache: false,
    };
    const envKey = await envBuilder.buildEnv(buildDto);
    expect(await isDockerResourceExist(envKey)).toEqual(true);

    // run container => check it exists
    const runDto: RunEnvDto = {
      envKey,
      label: buildDto.label,
      options: { isDelete: false },
    };
    const envHandle = await envRunner.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // check image has only one container
    const children = await envRunner.getEnvChildrenHandleIds(envKey);
    expect(children).toEqual([envHandle.id()]);

    //  delete env container stop logs collecting => check it does not exist
    await envHandle.delete({ isForce: true });
    expect(await envRunner.getEnvChildrenHandleIds(envKey)).toHaveLength(0);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);

    // delete env => check it does not exist
    await envBuilder.deleteEnv({ envKey, isForce: true });
    expect(await isDockerResourceExist(envKey)).toEqual(false);
  });

  it('should kill container if ram limit is reached', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const buildDto: BuildEnvDto = {
      label: generateRandomString('ram-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: 'cat /dev/zero | head -c 50m | tail',
      isCache: false,
    };
    const envKey = await envBuilder.buildEnv(buildDto);
    expect(await isDockerResourceExist(envKey)).toEqual(true);

    const runDto: RunEnvDto = {
      envKey,
      label: buildDto.label,
      limitations: { ram: '10m' },
      options: { isDelete: false },
    };
    const envHandle = await envRunner.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // wait until container killed
    const { exitCode } = await envHandle.wait();
    expect(exitCode).toEqual(OUT_OF_MEMORY_CODE);

    // clear
    await envHandle.delete({ isForce: true });
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);

    await envBuilder.deleteEnv({ envKey, isForce: true });
    expect(await isDockerResourceExist(envKey)).toEqual(false);
  });

  it('should kill container if timeout is reached', async () => {
    const envRunner = await buildEnvRunner();

    const { name, version } = DOCKER_IMAGES.nginx;

    const runDto: RunEnvDto = {
      envKey: buildDockerImage(name, version),
      label: generateRandomString('prescott-kill-container'),
      limitations: { ttl: 750 }, // 0.75s
      options: { isDelete: false },
    };
    const envHandle = await envRunner.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // wait until container killed
    const exitCode = await envHandle.wait();
    expect(exitCode).not.toEqual(0);

    // check it was stopped
    const [status] = await inspectDockerContainer(envHandle.id(), ['status']);
    expect(status).toEqual('exited');

    // clear
    await envHandle.delete({ isForce: true });
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);
  });

  it('should collect logs', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const buildDto: BuildEnvDto = {
      label: generateRandomString('log-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `for i in $(seq 10); do for j in $(seq 250); do echo -n 'A\n\tA'; done; done; echo 'ERROR!' >&2`,
      isCache: false,
    };
    const envKey = await envBuilder.buildEnv(buildDto);
    expect(await isDockerResourceExist(envKey)).toEqual(true);

    const runDto: RunEnvDto = {
      envKey,
      label: buildDto.label,
      options: { isDelete: false },
    };
    const envHandle = await envRunner.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // start consuming logs
    const logsPromise = asyncGeneratorToArray(envHandle.logs());

    // check logs collected
    const logs = await logsPromise;
    expect(logs).toHaveLength(2);

    expect(logs).toEqual(
      expect.arrayContaining([
        {
          stream: 'stdout',
          content: 'A\\n\\tA'.repeat(2_500),
          time: expect.any(Number),
        },
        {
          stream: 'stderr',
          content: 'ERROR!',
          time: expect.any(Number),
        },
      ] as LogEntry[])
    );

    // clear
    await envHandle.delete({ isForce: true });
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);

    await envBuilder.deleteEnv({ envKey, isForce: true });
    expect(await isDockerResourceExist(envKey)).toEqual(false);
  });

  it('should collect metrics - CONTINUOUS', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const buildDto: BuildEnvDto = {
      label: generateRandomString('metrics-continuous-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `for i in $(seq 3); do for j in $(seq 10000); do echo -n 'A'; done; sleep 1; done`,
      isCache: false,
    };
    const envKey = await envBuilder.buildEnv(buildDto);
    expect(await isDockerResourceExist(envKey)).toEqual(true);

    const runDto: RunEnvDto = {
      envKey,
      label: buildDto.label,
      options: { isDelete: false },
    };
    const envHandle = await envRunner.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // start consuming metrics
    const metricsPromise = asyncGeneratorToArray(envHandle.metrics());

    // check metrics collected
    await envHandle.wait();
    const metrics = await metricsPromise;
    expect(metrics.length).toBeGreaterThanOrEqual(4);

    // check metrics consistent
    for (const metric of metrics) {
      expect(metric).toMatchObject({
        ram: expect.any(String),
        cpu: expect.any(String),
        time: expect.any(Number),
      } as MetricEntry);
    }

    // clean
    await envBuilder.deleteEnv({ envKey, isForce: true });
    expect(await isDockerResourceExist(envKey)).toEqual(false);

    await envHandle.delete({ isForce: true }); // wait until completed
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);
  });

  it('should collect metrics - INTERVAL', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const buildDto: BuildEnvDto = {
      label: generateRandomString('metrics-interval-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `for i in $(seq 5); do for j in $(seq 10000); do echo -n 'A'; done; sleep 0.2; done`,
      isCache: false,
    };
    const envKey = await envBuilder.buildEnv(buildDto);
    expect(await isDockerResourceExist(envKey)).toEqual(true);

    const runDto: RunEnvDto = {
      envKey,
      label: buildDto.label,
      options: { isDelete: false },
    };
    const envHandle = await envRunner.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // start consuming metrics
    const intervalMs = 50;
    const metricsPromise = asyncGeneratorToArray(envHandle.metrics(intervalMs));

    // check metrics collected
    await envHandle.wait();
    const metrics = await metricsPromise;
    expect(metrics.length).toBeGreaterThanOrEqual(8);

    // check metrics consistent
    for (const metric of metrics) {
      expect(metric).toMatchObject({
        ram: expect.any(String),
        cpu: expect.any(String),
        time: expect.any(Number),
      } as MetricEntry);
    }

    // clean
    await envBuilder.deleteEnv({ envKey, isForce: true });
    expect(await isDockerResourceExist(envKey)).toEqual(false);

    await envHandle.delete({ isForce: true }); // wait until completed
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);
  });
});
