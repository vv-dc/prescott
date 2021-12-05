import * as pidusage from 'pidusage';
import { Status } from 'pidusage';
import { CommandBuilder } from '@lib/command-builder';
import { delay } from '@lib/time.utils';
import { processExists } from '@lib/shell.utils';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import { DockerRunDto } from '@model/dto/docker-run.dto';
import {
  buildDockerfile,
  buildImage,
  buildLimitations,
} from '@plugins/docker/docker.utils';

export class DockerService {
  async run(dto: DockerRunDto, detached = true) {
    const { image, container, context, limitations, withDelete, timeout } = dto;
    const command = new CommandBuilder()
      .init('docker run')
      .param('name', container);

    if (detached) command.arg('d');
    if (context) command.prepend(`cd ${context}`);
    if (limitations) buildLimitations(command, limitations);
    if (withDelete) command.param('rm');

    await command.with(image).execAsync();
    if (timeout) await this.stop(container, timeout);
  }

  async pull(name: string, version?: string | number): Promise<void> {
    const image = buildImage(name, version);
    const command = new CommandBuilder().init('docker pull').with(image);
    await command.execAsync();
  }

  async deleteImage(imageTag: string, force = false): Promise<void> {
    const command = new CommandBuilder().init('docker rmi');
    if (force) command.param('force');
    await command.with(imageTag).execAsync();
  }

  async deleteContainer(container: string, force = false): Promise<void> {
    const command = new CommandBuilder().init('docker rm');
    if (force) command.param('force');
    await command.with(container).execAsync();
  }

  async stop(container: string, timeout?: number): Promise<void> {
    const command = new CommandBuilder().init('docker stop').with(container);
    if (timeout) command.prepend(`sleep ${timeout} &&`);
    command.exec();
  }

  async build(dto: DockerBuildDto): Promise<void> {
    const { tag, osInfo, copy, cmd, once } = dto;
    const { name, version } = osInfo;

    const baseImage = buildImage(name, version);
    const dockerfile = buildDockerfile(baseImage, cmd, copy);

    const command = new CommandBuilder()
      .init('echo')
      .arg('e')
      .with(`"${dockerfile}"`)
      .pipe('docker build')
      .param('tag', tag);

    if (once) command.param('no-cache');
    await command.with('-').execAsync();
  }

  async pid(container: string): Promise<number> {
    const command = new CommandBuilder()
      .init('docker inspect')
      .param('format', '"{{ .State.Pid }}"')
      .with(container);
    const { stdout: pid } = await command.execAsync();
    return parseInt(pid, 10);
  }

  async *stats(container: string, interval = 50): AsyncGenerator<Status> {
    const pid = await this.pid(container);

    while (processExists(pid)) {
      yield pidusage(pid);
      await delay(interval);
    }
  }

  async logs(container: string) {
    const command = new CommandBuilder().init('docker logs').with(container);
    return command.execAsync();
  }
}
