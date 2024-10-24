import k8sKindDockerEnvBuilder from '@src/workdir/contract/env/k8s/k8s-kind-docker-env-builder';
import { EnvBuilderContract } from '@src/modules/contract/model/env/env-builder.contract';
import { prepareContract } from '@test/lib/test-contract.utils';
import { getAlpineBuildEnvDto } from '@test/lib/test-env.utils';

const buildEnvBuilder = async (): Promise<EnvBuilderContract> => {
  return prepareContract(k8sKindDockerEnvBuilder, {
    clusterName: 'prescott-test',
  });
};

// do not run until explicitly uncommented
describe.skip('k8s-kind-docker-env-builder', () => {
  it('should build docker image and load it to kind cluster', async () => {
    const envBuilder = await buildEnvBuilder();

    const label = 'k8s-kind-builder-test-load';
    const stepScript = `echo 'hello, world!'`;

    const buildDto = getAlpineBuildEnvDto(label, stepScript);
    const { envKey, script } = await envBuilder.buildEnv(buildDto);
    expect(envKey).toBeTruthy();
    expect(script).toBeNull();

    await envBuilder.deleteEnv({ envKey, isForce: true });
  });
});
