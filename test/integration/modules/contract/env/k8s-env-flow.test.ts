import * as path from 'node:path';
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
import { config, PRESCOTT_CONFIG } from '@config/config';

const buildEnvBuilder = async (): Promise<EnvBuilderContract> => {
  return prepareContract(k8sKindDockerEnvBuilder, {
    kindClusterName: 'prescott-test',
  });
};

// do not run until explicitly uncommented
describe.skip('k8s flow', () => {
  it('should load image to kind cluster after build', async () => {
    const envBuilder = await buildEnvBuilder();

    const buildDto: BuildEnvDto = {
      alias: generateRandomString('k8s-kind-build-test'),
      envInfo: DOCKER_IMAGES.alpine,
      script: `while true; do echo "'hello'" && echo '"hello"'; sleep 1000; done`,
      isCache: false,
    };

    const envId = await envBuilder.buildEnv(buildDto);
    expect(envId).toBeTruthy();

    await envBuilder.deleteEnv({ envId, isForce: true });
  });

  it('should connect to cluster using kubeConfigPath', async () => {
    await prepareContract(k8sEnvRunner, {
      kubeConfigPath: 'data/kubeconfig.yml',
    });
    expect.assertions(0);
  });

  it('should connect to cluster using kubeConfigString', async () => {
    const workDir = config[PRESCOTT_CONFIG].workDir;
    const kubeConfigPath = path.join(workDir, 'data/kubeconfig.yml');
    const kubeConfigString = await fsp.readFile(kubeConfigPath, 'utf-8');

    await prepareContract(k8sEnvRunner, {
      kubeConfigString,
    });
    expect.assertions(0);
  });

  it.todo('should connect to cluster using host + bearer');
});
