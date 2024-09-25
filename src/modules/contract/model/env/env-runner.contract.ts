import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { Contract } from '@modules/contract/model/contract';
import { Limitations } from '@model/domain/limitations';
import { EnvId } from '@modules/contract/model/env/env-id';

export interface EnvRunnerContract extends Contract {
  runEnv(dto: RunEnvDto): Promise<EnvHandle>;
  getEnvHandle(handleId: string): Promise<EnvHandle>;
  getEnvChildrenHandleIds(envId: EnvId): Promise<string[]>;
}

export interface RunEnvDto {
  /**
   * identifier of target environment's template (image etc.)
   */
  // TODO: rename to templateKey
  envId: EnvId;
  /**
   * safe identifier of the target task
   */
  // TODO: add
  // resourceId: string;
  limitations?: Limitations;
  options: RunEnvOptions;
  // TODO: extra args per task?
}

export interface RunEnvOptions {
  isDelete: boolean;
}
