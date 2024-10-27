import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';
import {
  BuildEnvDto,
  BuildEnvResultDto,
  DeleteEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import { generateRandomString } from '@lib/random.utils';
import {
  buildDockerCmd,
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

  async buildEnv(dto: BuildEnvDto): Promise<BuildEnvResultDto> {
    const dockerfileName = generateRandomString('dockerfile');
    const dockerfilePath = path.join(this.workDir, dockerfileName);
    try {
      const envKey = await this.buildEnvImpl(dto, dockerfilePath);
      return { envKey, script: null }; // script is already injected into image's CMD
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      await fs.rm(dockerfilePath).catch();
    }
  }

  private async buildEnvImpl(
    dto: BuildEnvDto,
    dockerfilePath: string
  ): Promise<string> {
    const { envInfo, steps, label } = dto;
    const { name, version } = envInfo;
    const script = buildDockerCmd(steps);

    const baseImage = buildDockerImage(name, version);
    const dockerfile = buildDockerfile(baseImage, script, false);
    await fs.writeFile(dockerfilePath, dockerfile);

    const command = new CommandBuilder()
      .init('docker build')
      .param('tag', label)
      .param('no-cache')
      .with('- <') // ignore context
      .with(dockerfilePath); // read from dockerfile

    await execDockerCommandWithCheck(label, command);
    return label;
  }

  async deleteEnv(dto: DeleteEnvDto): Promise<void> {
    const { envKey: image, isForce } = dto;
    const command = new CommandBuilder().init('docker rmi');
    if (isForce) command.param('force');
    await execDockerCommandWithCheck(image, command.with(image));
  }
}

export default {
  buildContract: async () => new DockerEnvBuilder(),
} satisfies ContractModule;
