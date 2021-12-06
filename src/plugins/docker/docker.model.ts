import { CommandBuilder } from '@lib/command-builder';
import { DockerRunDto } from '@model/dto/docker-run.dto';
import { Limitations } from '@model/domain/limitations';
import { Status } from 'pidusage';

export type RawStat = Status;

export type BuilderMapper = (
  builder: CommandBuilder,
  value?: string | number
) => void;

export type MappedLimitation = Exclude<keyof Limitations, 'ttl'>;

export type InspectParam =
  | 'pid'
  | 'returned'
  | 'startedAt'
  | 'finishedAt'
  | 'status'
  | 'retries';

export type RunOptions = Omit<
  DockerRunDto,
  'image' | 'container' | 'limitations'
>;
