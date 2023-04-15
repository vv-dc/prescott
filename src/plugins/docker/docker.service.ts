import * as pidusage from 'pidusage';

import {
  buildDockerfile,
  buildImage,
  buildInspectParam,
  buildLimitations,
  buildRunOptions,
} from '@plugins/docker/docker.utils';
import { InspectParam } from '@plugins/docker/model/inspect-param';
import { RawStat } from '@plugins/docker/model/raw-stat';
import { CommandBuilder } from '@lib/command-builder';
import { delay } from '@lib/time.utils';
import { processExists } from '@lib/shell.utils';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import { DockerRunDto } from '@model/dto/docker-run.dto';

export class DockerService {
  async run(dto: DockerRunDto) {
    const { image, container, limitations, ...options } = dto;

    const command = new CommandBuilder()
      .init('docker run')
      .param('name', container);
    if (limitations) buildLimitations(command, limitations);
    buildRunOptions(command, options);

    await command.with(image).execAsync();
    if (limitations?.ttl !== undefined) this.stop(container, limitations.ttl);
  }

  async pull(name: string, version?: string | number): Promise<void> {
    const image = buildImage(name, version);
    const command = new CommandBuilder().init('docker pull').with(image);
    await command.execAsync();
  }

  async deleteImage(imageTag: string, force = false): Promise<void> {
    const command = new CommandBuilder().init('docker rmi');
    if (force) command.param('force');
    const { stderr } = await command.with(imageTag).execAsync();
    if (stderr) throw new Error(stderr);
  }

  async deleteContainer(container: string, force = false): Promise<void> {
    const command = new CommandBuilder().init('docker rm');
    if (force) command.param('force');
    const { stderr } = await command.with(container).execAsync();
    if (stderr) throw new Error(stderr);
  }

  async stop(container: string, timeout?: number): Promise<void> {
    const command = new CommandBuilder().init('docker stop').with(container);
    if (timeout) command.prepend(`sleep ${timeout} &&`);
    const { stderr } = await command.execAsync();
    if (stderr) throw new Error(stderr);
  }

  async build(dto: DockerBuildDto): Promise<void> {
    const { tag, osInfo, copy, cmd, once } = dto;
    const { name, version } = osInfo;

    const baseImage = buildImage(name, version);
    const dockerfile = buildDockerfile(baseImage, cmd, copy);

    const command = new CommandBuilder()
      .init('printf')
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

  async *stats(container: string, interval = 50): AsyncGenerator<RawStat> {
    const pid = await this.pid(container);
    if (pid === 0) return; // container is down already
    while (processExists(pid)) {
      yield pidusage(pid);
      await delay(interval);
    }
  }

  async logs(container: string) {
    const command = new CommandBuilder().init('docker logs').with(container);
    return command.execAsync();
  }

  async getImageAncestors(image: string): Promise<string[]> {
    const command = new CommandBuilder()
      .init('docker ps')
      .arg('a')
      .arg('q')
      .param('filter')
      .with(`ancestor=${image}`);
    const { stdout } = await command.execAsync();
    return stdout.split('\n').slice(0, -1);
  }
}
