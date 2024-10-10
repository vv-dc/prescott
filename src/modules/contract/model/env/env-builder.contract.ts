import { Contract } from '@modules/contract/model/contract';
import { EnvInfo } from '@model/domain/env-info';
import { TaskStep } from '@src/model/domain/task-step';

export interface EnvBuilderContract extends Contract {
  buildEnv(dto: BuildEnvDto): Promise<BuildEnvResultDto>;
  deleteEnv(dto: DeleteEnvDto): Promise<void>;
}

export interface BuildEnvDto {
  /**
   * DNS-safe identifier of task. Unique per task, but not per run
   */
  label: string;
  envInfo: EnvInfo;
  steps: TaskStep[];
}

export interface BuildEnvResultDto {
  /**
   * Identifier of the environment (image etc.)
   */
  envKey: string;
  /**
   * Script/Command that should be executed by env-runner.
   * It can be empty, because the script sometimes can be
   * completely injected into built enviroment
   */
  script: string | null;
}

export interface DeleteEnvDto {
  envKey: string;
  isForce: boolean;
}
