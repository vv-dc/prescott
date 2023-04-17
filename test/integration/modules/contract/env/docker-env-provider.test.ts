import { asyncGeneratorToArray } from '@lib/async.utils';
import { DOCKER_IMAGES, OUT_OF_MEMORY_CODE } from '@test/lib/test.const';
import {
  CompileEnvDto,
  RunEnvDto,
} from '@modules/contract/model/env-provider.contract';
import envProviderBuilder from '@src/workdir/contract/env/docker-env-provider';
import { LogEntry } from '@modules/contract/model/log-entry';
import {
  buildDockerImage,
  inspectDockerContainer,
  isDockerResourceExist,
} from '@src/workdir/contract/env/docker.utils';
import { generateRandomString } from '@lib/random.utils';
import { MetricEntry } from '@modules/contract/model/metric-entry';

describe('docker-env-provider integration', () => {
  it('should handle life cycle of env from CREATE to DELETE', async () => {
    // build image => check it exists
    const envProvider = await envProviderBuilder.buildContract();
    const createDto: CompileEnvDto = {
      alias: 'build-test',
      envInfo: DOCKER_IMAGES.alpine,
      script: `while true; do echo "'hello'" && echo '"hello"'; sleep 1000; done`,
      isCache: false,
    };
    const envId = await envProvider.compileEnv(createDto);
    expect(await isDockerResourceExist(envId)).toEqual(true);

    // run container => check it exists
    const runDto: RunEnvDto = {
      envId,
      options: { isDelete: false },
    };
    const envHandle = await envProvider.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // check image has only one container
    const children = await envProvider.getEnvChildren(envId);
    expect(children).toEqual([envHandle.id()]);

    // delete env container stop logs collecting => check it does not exist
    await envHandle.delete({ isForce: true });
    expect(await envProvider.getEnvChildren(envId)).toHaveLength(0);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);

    // delete env => check it does not exist
    await envProvider.deleteEnv({ envId, isForce: true });
    expect(await isDockerResourceExist(envId)).toEqual(false);
  });

  it('should kill container if ram limit is reached', async () => {
    const envProvider = await envProviderBuilder.buildContract();

    const createDto: CompileEnvDto = {
      alias: generateRandomString('ram-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: 'cat /dev/zero | head -c 50m | tail',
      isCache: false,
    };
    const envId = await envProvider.compileEnv(createDto);
    expect(await isDockerResourceExist(envId)).toEqual(true);

    const runDto: RunEnvDto = {
      envId,
      limitations: { ram: '10m' },
      options: { isDelete: false },
    };
    const envHandle = await envProvider.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // wait until container killed
    await asyncGeneratorToArray(envHandle.logs());

    // check exit reason
    const [code] = await inspectDockerContainer(envHandle.id(), ['exitCode']);
    expect(code).toEqual(OUT_OF_MEMORY_CODE.toString());

    // clear
    await envHandle.delete({ isForce: true });
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);

    await envProvider.deleteEnv({ envId, isForce: true });
    expect(await isDockerResourceExist(envId)).toEqual(false);
  });

  it('should kill container if timeout is reached', async () => {
    const envProvider = await envProviderBuilder.buildContract();
    const { name, version } = DOCKER_IMAGES.nginx;

    const runDto: RunEnvDto = {
      envId: buildDockerImage(name, version),
      limitations: { ttl: 750 }, // 0.75s
      options: { isDelete: false },
    };
    const envHandle = await envProvider.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // wait until container killed
    await asyncGeneratorToArray(envHandle.logs());

    // check it was stopped
    const [status] = await inspectDockerContainer(envHandle.id(), ['status']);
    expect(status).toEqual('exited');

    // clear
    await envHandle.delete({ isForce: true });
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);
  });

  it.skip('should collect logs', async () => {
    const envProvider = await envProviderBuilder.buildContract();

    const createDto: CompileEnvDto = {
      alias: generateRandomString('log-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `for i in $(seq 5); do for j in $(seq 1000); do echo -n "A"; done; sleep 0.25; done`,
      isCache: false,
    };
    const envId = await envProvider.compileEnv(createDto);
    expect(await isDockerResourceExist(envId)).toEqual(true);

    const runDto: RunEnvDto = {
      envId,
      options: { isDelete: false },
    };
    const envHandle = await envProvider.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // start consuming logs
    const logsPromise = asyncGeneratorToArray(envHandle.logs());

    // stop container
    await envHandle.stop({});

    // check logs collected
    const logs = await logsPromise;
    expect(logs.length).toBeGreaterThanOrEqual(1);

    for (const log of logs) {
      expect(log).toMatchObject({
        content: expect.any(String),
        type: 'stdout',
        date: expect.any(Date),
      } as LogEntry);
    }

    const composedLog = logs.map((log) => log.content).join();
    expect(composedLog).toEqual('A'.repeat(5000));

    // clear
    await envHandle.delete({ isForce: true });
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);

    await envProvider.deleteEnv({ envId, isForce: true });
    expect(await isDockerResourceExist(envId)).toEqual(false);
  });

  it('should collect metrics - CONTINUOUS', async () => {
    const envProvider = await envProviderBuilder.buildContract();

    const createDto: CompileEnvDto = {
      alias: generateRandomString('metrics-continuous-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `for i in $(seq 3); do for j in $(seq 10000); do echo -n 'A'; done; sleep 1; done`,
      isCache: false,
    };
    const envId = await envProvider.compileEnv(createDto);
    expect(await isDockerResourceExist(envId)).toEqual(true);

    const runDto: RunEnvDto = {
      envId,
      options: { isDelete: false },
    };
    const envHandle = await envProvider.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // start consuming metrics
    const metricsPromise = asyncGeneratorToArray(envHandle.metrics());

    // stop container - metrics collecting should be stopped
    await envHandle.stop({});

    // check metrics collected
    const metrics = await metricsPromise;
    expect(metrics.length).toBeGreaterThanOrEqual(5);

    // check metrics consistent
    for (const metric of metrics) {
      expect(metric).toMatchObject({
        ram: expect.any(String),
        cpu: expect.any(String),
        elapsed: expect.any(String),
      } as MetricEntry);
    }

    // clean
    await envProvider.deleteEnv({ envId, isForce: true });
    expect(await isDockerResourceExist(envId)).toEqual(false);

    await envHandle.delete({ isForce: true }); // wait until completed
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);
  });

  it('should collect metrics - INTERVAL', async () => {
    const envProvider = await envProviderBuilder.buildContract();

    const createDto: CompileEnvDto = {
      alias: generateRandomString('metrics-continuous-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `for i in $(seq 5); do for j in $(seq 10000); do echo -n 'A'; done; sleep 0.2; done`,
      isCache: false,
    };
    const envId = await envProvider.compileEnv(createDto);
    expect(await isDockerResourceExist(envId)).toEqual(true);

    const runDto: RunEnvDto = {
      envId,
      options: { isDelete: false },
    };
    const envHandle = await envProvider.runEnv(runDto);
    expect(await isDockerResourceExist(envHandle.id())).toEqual(true);

    // start consuming metrics
    const intervalMs = 50;
    const metricsPromise = asyncGeneratorToArray(envHandle.metrics(intervalMs));

    // stop container - metrics collecting should be stopped
    await envHandle.stop({});

    // check metrics collected
    const metrics = await metricsPromise;
    expect(metrics.length).toBeGreaterThanOrEqual(16); // 20% deviation

    // check metrics consistent
    for (const metric of metrics) {
      expect(metric).toMatchObject({
        ram: expect.any(String),
        cpu: expect.any(String),
        elapsed: expect.any(String),
      } as MetricEntry);
    }

    // clean
    await envProvider.deleteEnv({ envId, isForce: true });
    expect(await isDockerResourceExist(envId)).toEqual(false);

    await envHandle.delete({ isForce: true }); // wait until completed
    expect(await isDockerResourceExist(envHandle.id())).toEqual(false);
  });
});
