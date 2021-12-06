import { CommandBuilder } from '@lib/command-builder';
import { Step } from '@model/domain/task-config';

export const buildDockerCmd = (separator: string, steps: Step[]): string => {
  const command = new CommandBuilder().init('echo').with(separator);

  for (const step of steps) {
    const { script, ignoreFailure } = step;
    const method = ignoreFailure ? 'then' : 'thenExec';
    command[method](script).then('echo').with(separator);
  }

  return command.build();
};

export const buildTaskIdentifier = (groupId: number, name: string): string =>
  `${groupId}_${name}`;
