import { CommandBuilder } from '@lib/command-builder';
import { decodeBase64 } from '@lib/string.utils';
import { Step } from '@model/dto/task-config.dto';

export const buildDockerCmd = (separator: string, steps: Step[]): string => {
  const command = new CommandBuilder().init('echo').with(separator);

  for (const step of steps) {
    const { script, ignoreFailure } = step;
    const scriptParsed = decodeBase64(script);
    const method = ignoreFailure === true ? 'then' : 'chain';
    command.then(scriptParsed)[method]('echo').with(separator);
  }

  return command.build();
};

export const buildTaskUniqueName = (groupId: number, name: string): string =>
  `${groupId}_${name}`;

export const buildTaskIdentifier = (taskId: number): string =>
  `prescott_${taskId}`;
