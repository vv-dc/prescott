import envBuilderFn from '@src/workdir/contract/env/docker/docker-env-builder';
import {
  BuildEnvDto,
  EnvBuilderContract,
} from '@src/modules/contract/model/env/env-builder.contract';
import { prepareContract } from '@test/lib/test-contract.utils';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { isDockerResourceExist } from '@src/workdir/contract/env/docker/docker.utils';
import { CommandBuilder } from '@src/lib/command-builder';

const buildEnvBuilder = (): Promise<EnvBuilderContract> => {
  return prepareContract(envBuilderFn);
};

describe('docker-env-builder integration', () => {
  it('should build image with CMD and then delete it', async () => {
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

    // new image was created
    expect(envKey).toEqual(buildDto.label);
    expect(await isDockerResourceExist(envKey)).toEqual(true);

    // script is injected into CMD
    expect(script).toBeNull();
    const expectedScript = buildDto.steps.map((s) => s.script).join(' && ');

    const command = new CommandBuilder()
      .init('docker inspect')
      .param('format', `'{{ .Config.Cmd }}'`)
      .with(envKey);
    const { stdout: imageScript } = await command.execAsync();
    expect(imageScript).toEqual(`[/bin/sh -c ${expectedScript}]\n`);

    // check image is deleted
    await envBuilder.deleteEnv({ envKey, isForce: true });
    expect(await isDockerResourceExist(envKey)).toEqual(false);
  });
});
