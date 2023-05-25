import { CommandBuilder } from '@lib/command-builder';
import { decodeBase64 } from '@lib/string.utils';
import { TaskStep } from '@model/domain/task-step';

export const buildTaskCmd = (separator: string, steps: TaskStep[]): string => {
  const command = new CommandBuilder().init('echo').with(separator);

  for (const step of steps) {
    const { script, ignoreFailure } = step;
    const scriptParsed = decodeBase64(script);
    const method = ignoreFailure ? 'then' : 'chain';
    command[method](scriptParsed);
  }

  return command.build();
};

export const buildTaskUniqueName = (groupId: number, name: string): string =>
  `${groupId}_${name}`;

export const buildTaskIdentifier = (taskId: number): string =>
  `prescott_${taskId}`;
