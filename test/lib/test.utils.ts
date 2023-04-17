import { DOCKER_IMAGES } from '@test/lib/test.const';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { TaskStep } from '@model/domain/task-step';

export const buildLocalTask = (
  name: string,
  steps: TaskStep[],
  cronString: string,
  once = false
): TaskConfigDto => ({
  name,
  osInfo: DOCKER_IMAGES.alpine,
  once,
  config: {
    local: { cronString },
    appConfig: {
      steps,
      limitations: {},
    },
  },
});
