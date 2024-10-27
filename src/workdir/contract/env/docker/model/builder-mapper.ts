import { CommandBuilder } from '@lib/command-builder';

export type BuilderMapper = (
  builder: CommandBuilder,
  value: string | number
) => void;
