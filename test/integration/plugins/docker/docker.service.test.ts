import { DockerService } from '@plugins/docker/docker.service';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import { DockerRunDto } from '@model/dto/docker-run.dto';
import { buildImage } from '@plugins/docker/docker.utils';
import { asyncGeneratorToArray } from '@lib/async.utils';
import {
  getTimeoutRejectPromise,
  generateRandomString,
} from '@test/lib/test.utils';
import { OUT_OF_MEMORY_CODE } from '@test/lib/test.const';

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
    const imageTag = generateRandomString('build-test');
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
    const imageTag = generateRandomString('run-test');
    const container = generateRandomString('run-test');

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
      container,
    };

    await dockerService.run(runDto);
    const { stdout: logs } = await dockerService.logs(container);
    expect(logs).toEqual(randomFile + '\n');

    await dockerService.deleteContainer(container);
    await dockerService.deleteImage(imageTag);
  });

  it('should exit when ram limit is reached', async () => {
    const imageTag = generateRandomString('limitations-test');
    const container = generateRandomString('limitations-test');

    const buildDto: DockerBuildDto = {
      tag: imageTag,
      osInfo: IMAGES.alpine,
      cmd: 'cat /dev/zero | head -c 50m | tail',
      once: true,
    };
    await dockerService.build(buildDto);

    const runDto: DockerRunDto = {
      image: imageTag,
      container,
      limitations: { ram: '10m' },
      withDelete: true,
    };

    await expect(dockerService.run(runDto, false)).rejects.toMatchObject({
      code: OUT_OF_MEMORY_CODE,
      stderr: 'Killed\n',
    });
  });

  it('should kill container if timeout is provided', async () => {
    const { name, version } = IMAGES.nginx;
    const runDto: DockerRunDto = {
      image: buildImage(name, version),
      container: generateRandomString('timeout-test'),
      timeout: 1,
      withDelete: true,
    };

    await Promise.race([
      dockerService.run(runDto),
      getTimeoutRejectPromise(2000),
    ]);

    expect.assertions(0); // should not throw
  });

  it('should find container pid', async () => {
    const { name, version } = IMAGES.nginx;
    const container = generateRandomString('pid-test');

    const runDto: DockerRunDto = {
      image: buildImage(name, version),
      container,
      withDelete: true,
    };
    await dockerService.run(runDto);

    const pid = await dockerService.pid(container);
    expect(pid).toBeTruthy();

    await dockerService.deleteContainer(container, true);
    await expect(dockerService.pid(container)).rejects.toMatchObject({
      code: 1,
      stderr: `Error: No such object: ${container}\n`,
    });
  });

  it('should collect container metrics', async () => {
    const { name, version } = IMAGES.nginx;
    const container = generateRandomString('metrics-test');

    const runDto: DockerRunDto = {
      image: buildImage(name, version),
      container,
      timeout: 1,
      withDelete: true,
    };

    await dockerService.run(runDto);
    const statsGenerator = dockerService.stats(container);
    const stats = await asyncGeneratorToArray(statsGenerator);

    expect(stats.length).toBeGreaterThan(15);
    expect(stats[0]).toMatchObject({
      cpu: expect.any(Number),
      memory: expect.any(Number),
      elapsed: expect.any(Number),
      pid: expect.any(Number),
    });
  });

  it('should collect logs', async () => {
    const imageTag = generateRandomString('logs-test');
    const container = generateRandomString('logs-test');

    const buildDto = {
      tag: imageTag,
      osInfo: IMAGES.alpine,
      cmd: 'while true; do echo hello world; done',
      once: true,
    };
    await dockerService.build(buildDto);

    const runDto: DockerRunDto = {
      image: imageTag,
      container,
      timeout: 1,
    };
    await dockerService.run(runDto);

    const { stdout, stderr } = await dockerService.logs(container);

    expect(stdout.startsWith('hello world\n'.repeat(10))).toBeTruthy();
    expect(stderr).toBeFalsy();
    await dockerService.deleteContainer(container, true);
  });
});
