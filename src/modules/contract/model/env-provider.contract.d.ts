import { Limitations } from '@model/domain/limitations';
import { OsInfo } from '@model/domain/os-info';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { Contract } from '@modules/contract/model/contract';

export interface EnvProviderContract extends Contract {
  runEnv(dto: RunEnvDto): Promise<EnvHandle>;
  compileEnv(dto: CompileEnvDto): Promise<string>;
  deleteEnv(dto: DeleteEnvDto): Promise<void>;
  deleteEnvHierarchical(dto: DeleteEnvDto): Promise<void>;
}

export type EnvId = string;

export interface RunEnvDto {
  envId: EnvId;
  limitations: Limitations;
}

export interface CompileEnvDto {
  alias: string;
  envInfo: OsInfo;
  script: string;
  isCache: boolean;
}

export interface DeleteEnvDto {
  envId: EnvId;
  isForce: boolean;
}
