import { Contract } from '@modules/contract/model/contract';
import { EnvInfo } from '@model/domain/env-info';

export interface EnvBuilderContract extends Contract {
  buildEnv(dto: BuildEnvDto): Promise<string>;
  deleteEnv(dto: DeleteEnvDto): Promise<void>;
}

// TODO: version separately - always tag images
export interface BuildEnvDto {
  /**
   * DNS-safe identifier of task. Unique per task, but not per run
   */
  label: string;
  envInfo: EnvInfo;
  script: string; // TODO: list of steps - every env builder should specify how to chain it
  isCache: boolean;
  // TODO: extra args per task?
}

export interface DeleteEnvDto {
  envKey: string;
  isForce: boolean;
}
