import envBuilderPassThroughFn from '@src/workdir/contract/env/docker/docker-pass-through-env-builder';
import {
  BuildEnvDto,
  EnvBuilderContract,
} from '@src/modules/contract/model/env/env-builder.contract';
import { prepareContract } from '@test/lib/test-contract.utils';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import {
  buildDockerImage,
  isDockerResourceExist,
} from '@src/workdir/contract/env/docker/docker.utils';
import { ContractOpts } from '@src/modules/contract/model/contract';

const buildEnvBuilder = (
  opts: ContractOpts = {}
): Promise<EnvBuilderContract> => {
  return prepareContract(envBuilderPassThroughFn, opts);
};

describe('docker-pass-through-env-builder integration', () => {
  it('should throw if image does not exist locally nor in registry', async () => {
    const envBuilder = await buildEnvBuilder();

    const buildDto: BuildEnvDto = {
      envInfo: {
        name: 'python',
        version: '0123456789',
      },
      label: 'docker-pt-builder-test-does-not-exist',
      steps: [],
    };

    await expect(envBuilder.buildEnv(buildDto)).rejects.toMatchObject({
      message: `Docker image 'python:0123456789' doesn't exist in any of available registries`,
    });
  });

  it('should not throw even if image does not with skipImageCheck = true', async () => {
    const envBuilder = await buildEnvBuilder({ skipImageCheck: 'true' });

    const buildDto: BuildEnvDto = {
      envInfo: {
        name: 'python',
        version: '0123456789',
      },
      label: 'docker-pt-builder-test-does-not-exist',
      steps: [
        {
          name: 'step #1',
          script: 'echo "hello, world!"',
        },
      ],
    };

    const { envKey, script } = await envBuilder.buildEnv(buildDto);
    expect(envKey).toEqual('python:0123456789');
    expect(script).toEqual('echo "hello, world!"');
  });

  it('should return joined script, but do not create a new image', async () => {
    const envBuilder = await buildEnvBuilder();

    const buildDto: BuildEnvDto = {
      envInfo: DOCKER_IMAGES.alpine,
      label: 'docker-pt-builder-test-success',
      steps: [
        {
          name: 'step #1',
          script: 'echo "hi there - 1"',
        },
        {
          name: 'step #2',
          script: `while true; do echo "'hello'" && echo '"hello"'; sleep 1000; done`,
        },
        {
          name: 'step #3',
          script: `echo "'hi there - one more time"'; echo "again"`,
        },
      ],
    };

    const { envKey, script } = await envBuilder.buildEnv(buildDto);
    expect(envKey).toEqual(
      buildDockerImage(DOCKER_IMAGES.alpine.name, DOCKER_IMAGES.alpine.version)
    );

    const expectedScript = buildDto.steps.map((s) => s.script).join(' && ');
    expect(script).toEqual(expectedScript);

    const beforeDeleteCheck = await isDockerResourceExist(envKey);
    await envBuilder.deleteEnv({ envKey, isForce: false });
    expect(await isDockerResourceExist(envKey)).toEqual(beforeDeleteCheck); // nothing happens
  });
});
