import { CommandBuilder } from '@lib/command-builder';
import { Step } from '@model/dto/task-config.dto';

export const buildDockerCmd = (separator: string, steps: Step[]): string => {
  const command = new CommandBuilder().init('echo').with(separator);

  for (const step of steps) {
    const { script, ignoreFailure } = step;
    const scriptParsed = Buffer.from(script, 'base64').toString('utf-8');
    const method = ignoreFailure === true ? 'then' : 'chain';
    command.then(scriptParsed)[method]('echo').with(separator);
  }

  return command.build();
};

export const buildTaskUniqueName = (groupId: number, name: string): string =>
  `${groupId}_${name}`;

export const buildTaskIdentifier = (taskId: number): string =>
  `prescott_${taskId}`;
