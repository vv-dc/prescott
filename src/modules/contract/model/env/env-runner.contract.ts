import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { Contract } from '@modules/contract/model/contract';
import { Limitations } from '@model/domain/limitations';
import { EnvId } from '@modules/contract/model/env/env-id';

export interface EnvRunnerContract extends Contract {
  runEnv(dto: RunEnvDto): Promise<EnvHandle>;
  getEnvHandle(handleId: string): Promise<EnvHandle>;
  getEnvChildren(envId: EnvId): Promise<string[]>;
}

export interface RunEnvDto {
  envId: EnvId;
  limitations?: Limitations;
  options: RunEnvOptions;
}

export interface RunEnvOptions {
  isDelete: boolean;
}
