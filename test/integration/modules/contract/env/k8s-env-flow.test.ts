import * as fsp from 'node:fs/promises';

import {
  BuildEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import { prepareContract } from '@test/lib/test-contract.utils';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { generateRandomString } from '@lib/random.utils';
import k8sKindDockerEnvBuilder from '@src/workdir/contract/env/k8s/k8s-kind-docker-env-builder';
import k8sEnvRunner from '@src/workdir/contract/env/k8s/k8s-env-runner';
import { getK8sApiConfig, getK8sResourcePath } from '@test/lib/test-k8s.utils';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { WaitEnvHandleResult } from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import { getAlpineBuildEnvDto, getRunEnvDto } from '@test/lib/test-env.utils';

const buildEnvBuilder = async (): Promise<EnvBuilderContract> => {
  return prepareContract(k8sKindDockerEnvBuilder, {
    clusterName: 'prescott-test',
  });
};

const buildEnvRunner = async (): Promise<EnvRunnerContract> => {
  const apiConfig = await getK8sApiConfig();
  const opts = {
    ...apiConfig,
    metricProvider: 'metrics-server',
  };
  return await prepareContract(k8sEnvRunner, opts);
};

// do not run until explicitly uncommented
describe.skip('k8s flow', () => {
  it('should load image to kind cluster after build', async () => {
    const envBuilder = await buildEnvBuilder();

    const buildDto: BuildEnvDto = {
      label: generateRandomString('k8s-kind-build-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `while true; do echo "'hello'" && echo '"hello"'; sleep 1000; done`,
      isCache: false,
    };

    const envKey = await envBuilder.buildEnv(buildDto);
    expect(envKey).toBeTruthy();

    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should connect to cluster using kubeConfigPath', async () => {
    await prepareContract(k8sEnvRunner, {
      kubeConfigPath: 'data/k8s/kubeconfig.yml',
    });
    expect.assertions(0);
  });

  it('should connect to cluster using kubeConfigString', async () => {
    const kubeConfigPath = getK8sResourcePath('kubeconfig.yml');
    const kubeConfigString = await fsp.readFile(kubeConfigPath, 'utf-8');

    await prepareContract(k8sEnvRunner, { kubeConfigString });
    expect.assertions(0);
  });

  it('should connect to cluster using host + bearer', async () => {
    const apiConfig = await getK8sApiConfig();
    await prepareContract(k8sEnvRunner, apiConfig);
    expect.assertions(0);
  });

  it('should handle errors during container creation inside the pod', async () => {
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-failure-during-creation';
    const envKey = 'some_non_existent_image-for_k8s';
    const runDto = getRunEnvDto(label, envKey);

    await expect(envRunner.runEnv(runDto)).rejects.toEqual(
      new Error(
        `[prescott-runner]: ErrImageNeverPull: Container image "${runDto.envKey}" is not present with pull policy of Never`
      )
    );
  });

  it('should return all children by label', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-kind-test-full-flow';
    const script = 'sleep 1000';
    const buildDto = getAlpineBuildEnvDto(label, script);

    const envKey = await envBuilder.buildEnv(buildDto);
    const runDto = getRunEnvDto(label, envKey);

    const envHandle1 = await envRunner.runEnv(runDto);
    const envHandle2 = await envRunner.runEnv(runDto);
    const envHandle3 = await envRunner.runEnv(runDto);

    const handleIds = await envRunner.getEnvChildrenHandleIds(label);
    expect(handleIds).toEqual(
      expect.arrayContaining([
        envHandle1.id(),
        envHandle2.id(),
        envHandle3.id(),
      ])
    );
    expect(handleIds).toHaveLength(3);

    await envHandle1.delete({ isForce: true });
    await envHandle2.delete({ isForce: true });
    await envHandle3.delete({ isForce: true });

    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should stop/delete pod immediately after TTL', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-ttl';
    const script = 'sleep 1000';
    const buildDto = getAlpineBuildEnvDto(label, script);

    const envKey = await envBuilder.buildEnv(buildDto);
    const runDto = getRunEnvDto(label, envKey, {
      ttl: 3_000,
    });

    const envHandle = await envRunner.runEnv(runDto);
    const waitResult = await envHandle.wait();

    expect(waitResult).toMatchObject({
      exitCode: 137,
      exitError:
        'DeadlineExceeded: Pod was active on the node longer than the specified deadline',
    } as WaitEnvHandleResult);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should delete pod on stop - IMMEDIATELY', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-stop-immediate';
    const script = 'sleep 1000';

    const buildDto = getAlpineBuildEnvDto(label, script);
    const envKey = await envBuilder.buildEnv(buildDto);
    const runDto = getRunEnvDto(label, envKey);

    const envHandle = await envRunner.runEnv(runDto);
    await envHandle.stop({ timeout: 0, signal: 'user' }); // stop immediately
    await envHandle.wait();

    const handleIds = await envRunner.getEnvChildrenHandleIds(runDto.label);
    expect(handleIds).toHaveLength(0);

    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should delete pod on stop - TIMEOUT', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-stop-timeout';
    const script = 'sleep 1000';

    const buildDto = getAlpineBuildEnvDto(label, script);
    const envKey = await envBuilder.buildEnv(buildDto);
    const runDto = getRunEnvDto(label, envKey);

    const envHandle = await envRunner.runEnv(runDto);
    await envHandle.stop({ timeout: 3_000, signal: 'user' }); // 3s
    await envHandle.wait();

    const handleIds = await envRunner.getEnvChildrenHandleIds(runDto.label);
    expect(handleIds).toHaveLength(0);

    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should wait until pod is finished - SUCCESS', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-wait-success';
    const script = `for i in $(seq 1 100); do echo "Hello"; done`;

    const buildDto = getAlpineBuildEnvDto(label, script);
    const envKey = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey);
    const envHandle = await envRunner.runEnv(runDto);
    const logsGenerator = envHandle.logs();
    const waitResult = await envHandle.wait();

    expect(waitResult).toMatchObject({
      exitCode: 0,
      exitError: null,
    } as WaitEnvHandleResult);
    const logsArray = await asyncGeneratorToArray(logsGenerator);
    expect(logsArray.length).toEqual(100);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should wait until pod is finished - FAILURE', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-wait-failure';
    const exitCode = 123;
    const script = `exit ${exitCode}`;

    const buildDto = getAlpineBuildEnvDto(label, script);
    const envKey = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey);
    const envHandle = await envRunner.runEnv(runDto);
    const logsGenerator = envHandle.logs();

    const waitResult = await envHandle.wait();
    expect(waitResult).toMatchObject({
      exitCode: exitCode,
      exitError: 'Error',
    } as WaitEnvHandleResult);

    const logsArray = await asyncGeneratorToArray(logsGenerator);
    expect(logsArray).toHaveLength(0);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should collect logs during pod execution', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-log';
    const script = 'for i in $(seq 50); do echo "hi-${i}"; done';

    const buildDto = getAlpineBuildEnvDto(label, script);
    const envKey = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey);
    const envHandle = await envRunner.runEnv(runDto);
    const logsGenerator = envHandle.logs();
    const logArrayPromise = asyncGeneratorToArray(logsGenerator);
    await envHandle.wait();

    const logsArray = await logArrayPromise;
    expect(logsArray).toHaveLength(50);

    const expectedLogs: LogEntry[] = Array.from({ length: 50 }, (_, idx) => ({
      time: expect.any(Number),
      content: `hi-${idx + 1}`,
      stream: 'stdout',
    }));
    expect(logsArray).toEqual(expectedLogs);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should collect metrics during pod execution - metrics-server', async () => {
    // metrics-server takes some time to start collecting metrics, so the test should run for a while
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-metrics';
    const script = 'for i in $(seq 30); do echo "nop-${i}" && sleep 1; done'; // 30 seconds running

    const buildDto = getAlpineBuildEnvDto(label, script);
    const envKey = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey);
    const envHandle = await envRunner.runEnv(runDto);
    const metricsGenerator = envHandle.metrics(5_000); // every 5s
    const metricsArrayPromise = asyncGeneratorToArray(metricsGenerator);
    await envHandle.wait();

    const metricsArray = await metricsArrayPromise;
    expect(metricsArray.length).toBeGreaterThan(1);

    const expectedMetrics: MetricEntry[] = Array.from(
      { length: metricsArray.length },
      () => ({
        time: expect.any(Number),
        ram: expect.any(String),
        cpu: expect.any(String),
      })
    );
    expect(metricsArray).toEqual(expectedMetrics);

    // check duplicates were skipped
    const allTimetamps = metricsArray.map((m) => m.time);
    const uniqueTimestamps = new Set(allTimetamps);
    expect(allTimetamps.length).toEqual(uniqueTimestamps.size);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });
});
