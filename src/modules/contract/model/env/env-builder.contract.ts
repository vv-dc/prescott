import { Contract } from '@modules/contract/model/contract';
import { EnvInfo } from '@model/domain/env-info';
import { EnvId } from '@modules/contract/model/env/env-id';

export interface EnvBuilderContract extends Contract {
  buildEnv(dto: BuildEnvDto): Promise<string>;
  deleteEnv(dto: DeleteEnvDto): Promise<void>;
}

export interface BuildEnvDto {
  alias: string;
  envInfo: EnvInfo;
  script: string;
  isCache: boolean;
}

export interface DeleteEnvDto {
  envId: EnvId;
  isForce: boolean;
}
