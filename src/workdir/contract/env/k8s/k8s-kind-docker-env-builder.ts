import { DockerEnvBuilder } from '@src/workdir/contract/env/docker/docker-env-builder';
import {
  BuildEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';
import { CommandBuilder } from '@lib/command-builder';
import { execDockerCommandWithCheck } from '@src/workdir/contract/env/docker/docker.utils';

const KIND_IMAGE_PREFIX = 'docker.io/library/';

class K8sKindDockerEnvBuilder
  extends DockerEnvBuilder
  implements EnvBuilderContract
{
  private clusterName!: string;

  override async init(opts: ContractInitOpts): Promise<void> {
    await super.init(opts);
    this.clusterName = opts.contract.clusterName || 'prescott';
  }

  override async buildEnv(dto: BuildEnvDto): Promise<string> {
    const imageId = await super.buildEnv(dto);
    await this.loadImageToKind(imageId);
    return this.addKindPrefixToImage(imageId);
  }

  private async loadImageToKind(imageId: string): Promise<void> {
    const command = new CommandBuilder()
      .init('kind load docker-image')
      .with(imageId)
      .param('name', this.clusterName);
    await execDockerCommandWithCheck(imageId, command);
  }

  private addKindPrefixToImage(imageId: string): string {
    return KIND_IMAGE_PREFIX + imageId;
  }
}

export default {
  buildContract: async () => new K8sKindDockerEnvBuilder(),
} satisfies ContractModule;
