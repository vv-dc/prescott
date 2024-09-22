import {
  BuildEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import { prepareContract } from '@test/lib/test-contract.utils';
import k8sKindDockerEnvBuilder from '@src/workdir/contract/env/k8s/k8s-kind-docker-env-builder';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { generateRandomString } from '@lib/random.utils';

const buildEnvBuilder = async (): Promise<EnvBuilderContract> => {
  return prepareContract(k8sKindDockerEnvBuilder, {
    kindClusterName: 'prescott-test',
  });
};

// do not run until explicitly uncommented
describe.skip('k8s-kind-docker-env-builder', () => {
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
});
