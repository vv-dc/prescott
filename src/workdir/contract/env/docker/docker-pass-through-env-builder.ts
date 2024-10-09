import {
  ContractInitOpts,
  ContractModule,
} from '@src/modules/contract/model/contract';
import {
  BuildEnvDto,
  BuildEnvResultDto,
  DeleteEnvDto,
  EnvBuilderContract,
} from '@src/modules/contract/model/env/env-builder.contract';
import { buildDockerCmd, buildDockerImage } from './docker.utils';
import { CommandBuilder } from '@src/lib/command-builder';
import { errorToReason } from '@src/modules/errors/get-error-reason';

export class DockerPassThroughEnvBuilder implements EnvBuilderContract {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async init(_opts: ContractInitOpts): Promise<void> {
    // no-op
  }

  async buildEnv(dto: BuildEnvDto): Promise<BuildEnvResultDto> {
    const { envInfo, steps } = dto;

    const { name, version } = envInfo;
    const envKey = buildDockerImage(name, version);
    await this.assertImageExists(envKey);

    const script = buildDockerCmd(steps);
    return { envKey, script };
  }

  private async assertImageExists(imageTag: string): Promise<void> {
    const imageExists =
      (await this.checkImageExistsLocally(imageTag)) ||
      (await this.checkImageExistsInRegistry(imageTag));

    if (!imageExists) {
      throw new Error(
        `Docker image '${imageTag}' doesn't exist in any of available registries`
      );
    }
  }

  private checkImageExistsLocally(imageTag: string): Promise<boolean> {
    const command = new CommandBuilder()
      .init('docker image inspect')
      .with(imageTag)
      .overwriteFile('/dev/null');
    return this.execWithReasonCheck(command, 'No such image', false);
  }

  private checkImageExistsInRegistry(imageTag: string): Promise<boolean> {
    const command = new CommandBuilder()
      .init('docker manifest inspect')
      .with(`'${imageTag}'`)
      .overwriteFile('/dev/null');
    return this.execWithReasonCheck(command, 'no such manifest', false);
  }

  private async execWithReasonCheck(
    command: CommandBuilder,
    reasonTemplate: string,
    onErrorTemplateValue: boolean
  ): Promise<boolean> {
    try {
      const { child } = await command.execAsync();
      return child.exitCode === 0;
    } catch (err) {
      const reason = errorToReason(err);
      if (reason.includes(reasonTemplate)) {
        return onErrorTemplateValue;
      }
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteEnv(_dto: DeleteEnvDto): Promise<void> {
    // nothing to delete - no image was ever created
  }
}

export default {
  buildContract: async () => new DockerPassThroughEnvBuilder(),
} satisfies ContractModule;
