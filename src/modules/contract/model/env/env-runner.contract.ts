import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { Contract } from '@modules/contract/model/contract';
import { Limitations } from '@model/domain/limitations';

export interface EnvRunnerContract extends Contract {
  runEnv(dto: RunEnvDto): Promise<EnvHandle>;
  getEnvHandle(handleId: string): Promise<EnvHandle>;
  getEnvChildrenHandleIds(envKey: string): Promise<string[]>;
}

export interface RunEnvDto {
  /**
   * Identifier of environment's template (image etc.)
   */
  envKey: string;
  /**
   * DNS-safe identifier of task. Unique per task, but not per run
   */
  label: string;
  script: string | null;
  limitations?: Limitations;
  options: RunEnvOptions;
  // TODO: extra args per task?
}

export interface RunEnvOptions {
  isDelete: boolean;
}
