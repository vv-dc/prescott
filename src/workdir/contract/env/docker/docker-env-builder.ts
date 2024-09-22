import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';
import {
  BuildEnvDto,
  DeleteEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import { generateRandomString } from '@lib/random.utils';
import {
  buildDockerfile,
  buildDockerImage,
  execDockerCommandWithCheck,
} from '@src/workdir/contract/env/docker/docker.utils';
import { CommandBuilder } from '@lib/command-builder';

export class DockerEnvBuilder implements EnvBuilderContract {
  private workDir = '';

  async init(opts: ContractInitOpts) {
    this.workDir = opts.system.workDir;
  }

  async buildEnv(dto: BuildEnvDto): Promise<string> {
    const dockerfileName = generateRandomString('dockerfile');
    const dockerfilePath = path.join(this.workDir, dockerfileName);
    try {
      return await this.buildEnvImpl(dto, dockerfilePath);
    } finally {
      await fs.rm(dockerfilePath).catch();
    }
  }

  private async buildEnvImpl(
    dto: BuildEnvDto,
    dockerfilePath: string
  ): Promise<string> {
    const { envInfo, script, isCache, alias: imageTag } = dto;
    const { name, version } = envInfo;

    const baseImage = buildDockerImage(name, version);
    const dockerfile = buildDockerfile(baseImage, script, false);
    await fs.writeFile(dockerfilePath, dockerfile);

    const command = new CommandBuilder()
      .init('docker build')
      .param('tag', imageTag)
      .with('- <') // ignore context
      .with(dockerfilePath); // read from dockerfile

    if (!isCache) command.param('no-cache');
    await execDockerCommandWithCheck(imageTag, command);

    return imageTag;
  }

  async deleteEnv(dto: DeleteEnvDto): Promise<void> {
    const { envId: image, isForce } = dto;
    const command = new CommandBuilder().init('docker rmi');
    if (isForce) command.param('force');
    await execDockerCommandWithCheck(image, command.with(image));
  }
}

export default {
  buildContract: async () => new DockerEnvBuilder(),
} satisfies ContractModule;
