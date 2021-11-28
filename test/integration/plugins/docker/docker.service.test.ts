import { DockerService } from '@plugins/docker/docker.service';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import { DockerRunDto } from '@model/dto/docker-run.dto';
import { generateRandomString } from '@lib/random-utils';

describe('docker.service integration', () => {
  const dockerService = new DockerService();

  it('should build image', async () => {
    const imageTag = generateRandomString('image-build-test');
    const dto: DockerBuildDto = {
      tag: imageTag,
      osInfo: {
        name: 'alpine',
        version: 3.15,
      },
      cmd: 'echo "hello, world!"',
      once: true,
    };

    await dockerService.build(dto);
    await dockerService.deleteImage(imageTag);
  });

  it('should run container', async () => {
    const imageTag = generateRandomString('image-run-test');
    const containerName = generateRandomString('container-run-test');

    const randomFile = generateRandomString() + '.ts';
    const randomCommand = `touch ${randomFile} && ls`;

    const buildDto: DockerBuildDto = {
      tag: imageTag,
      osInfo: {
        name: 'alpine',
        version: 3.15,
      },
      cmd: randomCommand,
      once: true,
    };
    await dockerService.build(buildDto);

    const runDto: DockerRunDto = {
      image: imageTag,
      container: containerName,
      withDelete: true,
    };
    const { stdout } = await dockerService.run(runDto);

    expect(stdout).toEqual(randomFile + '\n');
    await dockerService.deleteImage(imageTag, true);
  });
});
