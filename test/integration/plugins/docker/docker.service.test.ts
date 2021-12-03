import { DockerService } from '@plugins/docker/docker.service';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import { DockerRunDto } from '@model/dto/docker-run.dto';
import { generateRandomString } from '@lib/random.utils';
import { buildImage } from '@plugins/docker/docker.utils';

import { getTimeoutRejectPromise } from '../../../lib/test.utils';
import { TIMEOUT_ERROR_CODE } from '../../../lib/test.const';

describe('docker.service integration', () => {
  const dockerService = new DockerService();

  const IMAGES = {
    nginx: {
      name: 'nginx',
      version: '1.21-alpine',
    },
    alpine: {
      name: 'alpine',
      version: 3.15,
    },
  };

  beforeAll(async () => {
    for (const { name, version } of Object.values(IMAGES)) {
      await dockerService.pull(name, version);
    }
  });

  afterAll(async () => {
    for (const { name, version } of Object.values(IMAGES)) {
      const imageTag = buildImage(name, version);
      await dockerService.deleteImage(imageTag, true);
    }
  });

  it('should build image', async () => {
    const imageTag = generateRandomString('image-build-test');
    const dto: DockerBuildDto = {
      tag: imageTag,
      osInfo: IMAGES.alpine,
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
      osInfo: IMAGES.alpine,
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
    await dockerService.deleteImage(imageTag);
  });

  it('should kill container if timeout is provided', async () => {
    const { name, version } = IMAGES.nginx;
    const runDto: DockerRunDto = {
      image: buildImage(name, version),
      container: generateRandomString('timeout-test'),
      limitations: { ttl: 2 },
      withDelete: true,
    };

    const racePromise = Promise.race([
      dockerService.run(runDto),
      getTimeoutRejectPromise(3000),
    ]);

    await expect(racePromise).rejects.toMatchObject({
      code: TIMEOUT_ERROR_CODE,
    });
  });
});
