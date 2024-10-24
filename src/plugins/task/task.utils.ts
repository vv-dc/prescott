import { decodeBase64 } from '@lib/string.utils';
import { TaskStep } from '@model/domain/task-step';

export const buildTaskUniqueName = (groupId: number, name: string): string =>
  `${groupId}-${name}`;

// RFC 1123
export const buildTaskLabel = (taskId: number): string => `prescott-${taskId}`;

// steps are base64 encoded for easier network transmition
export const decodeTaskSteps = (steps: TaskStep[]): TaskStep[] =>
  steps.map((step) => ({
    ...step,
    script: decodeBase64(step.script),
  }));
