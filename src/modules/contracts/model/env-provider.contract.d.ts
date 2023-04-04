import { Limitations } from '@model/domain/limitations';
import { OsInfo } from '@model/domain/os-info';
import { EnvId } from '@plugins/docker/docker.service';
import { EnvHandle } from '@modules/contracts/model/env-handle';

export interface EnvProviderContract {
  runEnv(dto: RunEnvDto): Promise<EnvHandle>;
  compileEnv(dto: CompileEnvDto): Promise<string>;
  deleteEnv(dto: DeleteEnvDto): Promise<void>;
  deleteEnvHierarchical(dto: DeleteEnvDto): Promise<void>;
}

export type EnvId = string;

export interface RunEnvDto {
  id: EnvId;
  limitations: Limitations;
}

export interface CompileEnvDto {
  alias: string;
  envInfo: OsInfo;
  script: string;
  noCache: boolean;
}

export interface DeleteEnvDto {
  envId: EnvId;
  force: boolean;
}
