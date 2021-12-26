import { CommandBuilder } from '@lib/command-builder';
import { Limitations } from '@model/domain/limitations';
import { InspectParam } from '@plugins/docker/model/inspect-param';
import { RunOptions } from '@plugins/docker/model/run-options';
import { MappedLimitation } from '@plugins/docker/model/mapped-limitation';
import { BuilderMapper } from '@plugins/docker/model/builder-mapper';

export const buildImage = (name: string, version?: string | number): string =>
  `${name}:${version ?? 'latest'}`;

export const escapeBash = (cmd: string): string =>
  cmd.replace(/"/g, `\\` + `"`).replace(/'/, `\\'`);

export const buildDockerfile = (
  image: string,
  cmd: string,
  copy = false
): string => {
  const statements = [
    `FROM ${image} AS base`,
    `WORKDIR /usr/src/app`,
    ...(copy ? ['COPY . .'] : []),
    `CMD ${cmd}`,
  ];
  return escapeBash(statements.join('\n'));
};

const LIMITATIONS_MAP: Record<MappedLimitation, BuilderMapper> = {
  ram: (builder, value) => {
    builder.param('memory', value);
  },
  rom: (builder, value) => {
    builder.param('storage-opt').with(`size=${value}`);
  },
  cpus: (builder: CommandBuilder, value) => {
    builder.param('cpus', value);
  },
};

export const buildLimitations = (
  builder: CommandBuilder,
  limitations: Limitations
): void => {
  for (const [limitation, value] of Object.entries(limitations)) {
    if (value !== undefined && limitation !== 'ttl') {
      const mapper = LIMITATIONS_MAP[limitation as MappedLimitation];
      mapper(builder, value);
    }
  }
};

export const buildRunOptions = (
  builder: CommandBuilder,
  options: RunOptions
): void => {
  const { detached, context, withDelete } = options;
  if (detached) builder.arg('d');
  if (withDelete) builder.param('rm');
  if (context !== undefined) builder.prepend(`cd ${context}`);
};

const INSPECT_MAP: Record<InspectParam, string> = {
  pid: '{{ .State.Pid }}',
  returned: '{{ .Status.ExitCode }}',
  status: '{{ .State.Status }}',
  startedAt: '{{ .State.StartedAt }}',
  finishedAt: '{{ .State.FinishedAt }}',
  retries: '{{ .RestartCount }}',
};

export const buildInspectParam = (param: InspectParam): string => {
  const mappedParam = INSPECT_MAP[param];
  if (mappedParam !== undefined) {
    return mappedParam;
  } else throw new Error('Invalid inspect param');
};
