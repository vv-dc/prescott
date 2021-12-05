import { CommandBuilder } from '@lib/command-builder';
import { DockerRunDto } from '@model/dto/docker-run.dto';

export type BuilderMapper = (
  builder: CommandBuilder,
  value?: string | number
) => void;

export type OptionalRunOptions = Omit<
  DockerRunDto,
  'image' | 'container' | 'timeout'
>;

export type InspectParam =
  | 'pid'
  | 'returned'
  | 'startedAt'
  | 'finishedAt'
  | 'status'
  | 'retries';
