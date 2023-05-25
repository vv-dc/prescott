import { Limitations } from '@model/domain/limitations';
import { EnvInfo } from '@model/domain/env-info';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { Contract } from '@modules/contract/model/contract';

export interface EnvProviderContract extends Contract {
  runEnv(dto: RunEnvDto): Promise<EnvHandle>;
  compileEnv(dto: CompileEnvDto): Promise<string>;
  deleteEnv(dto: DeleteEnvDto): Promise<void>;
  getEnvChildren(envId: EnvId): Promise<string[]>;
  getEnvHandle(handleId: string): Promise<EnvHandle>;
}

export type EnvId = string;

export interface RunEnvDto {
  envId: EnvId;
  limitations?: Limitations;
  options: RunEnvOptions;
}

export interface RunEnvOptions {
  isDelete: boolean;
}

export interface CompileEnvDto {
  alias: string;
  envInfo: EnvInfo;
  script: string;
  isCache: boolean;
}

export interface DeleteEnvDto {
  envId: EnvId;
  isForce: boolean;
}
