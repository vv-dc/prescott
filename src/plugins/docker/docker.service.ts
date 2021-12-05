import * as pidusage from 'pidusage';
import { Status } from 'pidusage';
import { CommandBuilder } from '@lib/command-builder';
import { delay } from '@lib/time.utils';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import { DockerRunDto } from '@model/dto/docker-run.dto';
import {
  buildDockerfile,
  buildImage,
  buildInspectParam,
  buildRunOptions,
} from '@plugins/docker/docker.utils';
import { InspectParam } from '@plugins/docker/docker.model';
import { processExists } from '@lib/shell.utils';

export class DockerService {
  async run(dto: DockerRunDto) {
    const { image, container, timeout, ...options } = dto;

    const command = new CommandBuilder()
      .init('docker run')
      .param('name', container);
    buildRunOptions(command, options);

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

  async inspect(container: string, params: InspectParam[]): Promise<string[]> {
    const formatBody = `"${params.map(buildInspectParam).join(',')}"`;
    const command = new CommandBuilder()
      .init('docker inspect')
      .param('format', formatBody)
      .with(container);
    const { stdout: inspectString } = await command.execAsync();
    return inspectString.slice(0, -1).split(','); // exclude last '\n'
  }

  async pid(container: string): Promise<number> {
    const [pid] = await this.inspect(container, ['pid']);
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
