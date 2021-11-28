import { CommandBuilder } from '@lib/command-builder';
import { DockerBuildDto } from '@model/dto/docker-build.dto';
import {
  buildDockerfile,
  buildImage,
  buildLimitations,
} from '@plugins/docker/docker.utils';
import { DockerRunDto } from '@model/dto/docker-run.dto';

export class DockerService {
  async run(dto: DockerRunDto) {
    const { image, container, context, limitations, withDelete } = dto;

    const command = new CommandBuilder()
      .init('docker run')
      .param('name', container);
    if (context) command.prepend(`cd ${context}`);

    if (limitations) buildLimitations(command, limitations);
    if (withDelete) command.param('rm');

    return command.with(image).execAsync();
  }

  async pull(name: string, version?: string | number): Promise<void> {
    const image = buildImage(name, version);
    const command = new CommandBuilder().init('docker pull').with(image);
    await command.execAsync();
  }

  async deleteImage(image: string, force = false): Promise<void> {
    const command = new CommandBuilder().init('docker rmi');
    if (force) command.param('force');
    await command.with(image).execAsync();
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
}
