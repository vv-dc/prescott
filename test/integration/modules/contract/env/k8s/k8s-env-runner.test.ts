import * as fsp from 'node:fs/promises';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';
import {
  prepareContactSystemOpts,
  prepareContract,
} from '@test/lib/test-contract.utils';
import envBuilderPassThroughFn from '@src/workdir/contract/env/docker/docker-pass-through-env-builder';
import k8sEnvRunner from '@src/workdir/contract/env/k8s/k8s-env-runner';
import { getK8sApiConfig, getK8sResourcePath } from '@test/lib/test-k8s.utils';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { WaitEnvHandleResult } from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import { getAlpineBuildEnvDto, getRunEnvDto } from '@test/lib/test-env.utils';
import { K8sPodMetricProvider } from '@src/workdir/contract/env/k8s/model/k8s-pod-config';
import { ContractOpts } from '@src/modules/contract/model/contract';

const buildEnvBuilder = (): Promise<EnvBuilderContract> => {
  return prepareContract(envBuilderPassThroughFn, {
    skipImageCheck: 'true',
  });
};

const buildEnvRunner = async (
  metricProvider: K8sPodMetricProvider = 'none',
  extraOpts: ContractOpts = {}
): Promise<EnvRunnerContract> => {
  const apiConfig = await getK8sApiConfig();
  return await prepareContract(k8sEnvRunner, {
    ...apiConfig,
    ...extraOpts,
    metricProvider,
  });
};

// do not run until explicitly uncommented
describe.skip('k8s-env-runner [pass-through]', () => {
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

  it('should throw an error if service account does not have access to namespace', async () => {
    await expect(
      buildEnvRunner('metrics-server', { namespace: 'default' })
    ).rejects.toMatchObject({
      message:
        'K8s-env-runner: serviceaccounts "prescott-sa" is forbidden: ' +
        'User "system:serviceaccount:prescott:prescott-sa" cannot create ' +
        'resource "serviceaccounts/token" in API group "" in the namespace "default"[403]',
    });
  });

  it('should refresh service account token immediately and then save it to FS', async () => {
    // prepare
    const systemOpts = await prepareContactSystemOpts();
    const token = (await getK8sApiConfig()).token as string;
    const tokenHash = crypto.createHash('md5').update(token).digest('hex');
    const tokenPath = path.join(
      systemOpts.workDir,
      `data/k8s/token-${tokenHash}.txt`
    );

    // first refresh
    await buildEnvRunner();
    const firstToken = await fsp.readFile(tokenPath, 'utf-8');

    // second refresh
    await buildEnvRunner();
    const secondToken = await fsp.readFile(tokenPath, 'utf-8');

    // third refresh
    await buildEnvRunner();
    const thirdToken = await fsp.readFile(tokenPath, 'utf-8');

    // tokens are not equal
    expect(firstToken).not.toEqual(secondToken);
    expect(firstToken).not.toEqual(thirdToken);
    expect(secondToken).not.toEqual(thirdToken);
  });

  it('should handle errors during container creation inside the pod', async () => {
    const envRunner = await buildEnvRunner('metrics-server', {
      imagePullPolicy: 'Never',
    });

    const label = 'k8s-test-failure-during-creation';
    const envKey = 'some_non_existent_image-for_k8s';
    const runDto = getRunEnvDto(label, envKey, null);

    await expect(envRunner.runEnv(runDto)).rejects.toMatchObject({
      message:
        `ErrImageNeverPull: Container image "${runDto.envKey}" ` +
        `is not present with pull policy of Never`,
    });
  });

  it('should not throw even if script is invalid', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-invalid-script';
    const stepScript = 'some_non_existent_executable "hello, world"';
    const buildDto = getAlpineBuildEnvDto(label, stepScript);

    const { envKey, script } = await envBuilder.buildEnv(buildDto);
    const runDto = getRunEnvDto(label, envKey, script);

    const envHandle = await envRunner.runEnv(runDto);
    await envHandle.wait();

    const logsGenerator = envHandle.logs();
    const logsArray = await asyncGeneratorToArray(logsGenerator);
    expect(logsArray).toEqual([
      {
        time: expect.any(Number),
        stream: 'stdout',
        content: '/bin/sh: some_non_existent_executable: not found',
      },
    ] satisfies LogEntry[]);
  });

  it('should return all children by label', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-kind-test-full-flow';
    const stepScript = 'sleep 1000';

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey, script);
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

  it('should apply limitations - TTL', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-limitation-ttl';
    const stepScript = 'sleep 1000';

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey, script, { ttl: 3_000 }); // 3s
    const envHandle = await envRunner.runEnv(runDto);
    const waitResult = await envHandle.wait();

    expect(waitResult).toMatchObject({
      exitCode: 137,
      exitError:
        'Error: DeadlineExceeded: Pod was active on the node longer than the specified deadline',
    } as WaitEnvHandleResult);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should apply limitations - RAM', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-limitation-ram';
    const stepScript = `cat /dev/zero | head -c 150m | tail`;

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    // k8s needs some memory to initialize the container
    // if RAM limit is too low, pod will be in "ContainerCreating" indefinitely
    const runDto = getRunEnvDto(label, envKey, script, { ram: '128Mi' });
    const envHandle = await envRunner.runEnv(runDto);
    const waitResult = await envHandle.wait();

    expect(waitResult).toMatchObject({
      exitCode: 137,
      exitError: 'OOMKilled: code=137',
    } as WaitEnvHandleResult);

    await envHandle.delete({ isForce: true });
    await envBuilder.deleteEnv({ envKey, isForce: true });
  });

  it('should delete pod on stop - IMMEDIATELY', async () => {
    const envBuilder = await buildEnvBuilder();
    const envRunner = await buildEnvRunner();

    const label = 'k8s-test-stop-immediate';
    const stepScript = 'sleep 1000';

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);
    const runDto = getRunEnvDto(label, envKey, script);

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
    const stepScript = 'sleep 1000';

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey, script);
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
    const stepScript = `for i in $(seq 1 100); do echo "Hello"; done`;

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey, script);
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
    const stepScript = `exit ${exitCode}`;

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey, script);
    const envHandle = await envRunner.runEnv(runDto);
    const logsGenerator = envHandle.logs();

    const waitResult = await envHandle.wait();
    expect(waitResult).toMatchObject({
      exitCode: exitCode,
      exitError: 'Error: code=123',
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
    const stepScript = 'for i in $(seq 50); do echo "hi-${i}"; done';

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);

    const runDto = getRunEnvDto(label, envKey, script);
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

  // metrics-server takes some time to start collecting metrics, so the test should run for a while
  it.each([
    { type: 'metrics-server', iterations: 25 }, // every iteration - 1s
    { type: 'prometheus', iterations: 30 },
  ] as const)(
    'should collect metrics during pod execution - %s',
    async ({ type, iterations }) => {
      const envBuilder = await buildEnvBuilder();
      const envRunner = await buildEnvRunner(type);

      const label = 'k8s-test-metrics';
      const stepScript = `for i in $(seq ${iterations}); do echo "nop-$i" && sleep 1; done`; // 30 seconds running

      const buildDto = getAlpineBuildEnvDto(label, stepScript);
      const { envKey, script } = await envBuilder.buildEnv(buildDto);

      const runDto = getRunEnvDto(label, envKey, script);
      const envHandle = await envRunner.runEnv(runDto);
      const metricsGenerator = envHandle.metrics(3_000); // every 3s
      const metricsArrayPromise = asyncGeneratorToArray(metricsGenerator);
      await envHandle.wait();

      const metricsArray = await metricsArrayPromise;

      await envHandle.delete({ isForce: true });
      await envBuilder.deleteEnv({ envKey, isForce: true });

      expect(metricsArray.length).toBeGreaterThan(0);

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
    }
  );
});
