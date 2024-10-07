import { Limitations } from '@src/model/dto/task-config.dto';
import { BuildEnvDto } from '@src/modules/contract/model/env/env-builder.contract';
import { RunEnvDto } from '@src/modules/contract/model/env/env-runner.contract';
import { DOCKER_IMAGES } from './test.const';

export const getAlpineBuildEnvDto = (
  label: string,
  script: string
): BuildEnvDto => {
  return {
    label,
    envInfo: DOCKER_IMAGES.alpine,
    steps: [
      {
        name: 'step #1',
        script,
      },
    ],
    isCache: false,
  };
};

export const getRunEnvDto = (
  label: string,
  envKey: string,
  script: string | null,
  limitations?: Limitations
): RunEnvDto => {
  return {
    label,
    envKey,
    script,
    options: {
      isDelete: false,
    },
    limitations,
  };
};
