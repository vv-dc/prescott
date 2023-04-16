import { CommandBuilder } from '@lib/command-builder';
import {
  EnvId,
  RunEnvOptions,
} from '@modules/contract/model/env-provider.contract';
import { InspectParam } from '@plugins/docker/model/inspect-param';
import { MappedLimitation } from '@plugins/docker/model/mapped-limitation';
import { BuilderMapper } from '@plugins/docker/model/builder-mapper';
import { Limitations } from '@model/domain/limitations';

export class DockerEnvError extends Error {
  constructor(private entityId: string | EnvId, message: string) {
    super(message);
  }
}

export const execDockerCommandWithCheck = async (
  entityId: string,
  command: CommandBuilder
): Promise<{ stdout: string; stderr: string }> => {
  const { stdout, stderr, child } = await command.execAsync();
  if (stderr && child.exitCode !== 0) {
    throw new DockerEnvError(entityId, stderr);
  }
  return { stdout, stderr };
};

export const applyDockerRunOptions = (
  builder: CommandBuilder,
  options: RunEnvOptions
): void => {
  const { context, isDelete } = options;
  if (isDelete) builder.param('rm');
  if (context !== undefined) builder.prepend(`cd ${context}`);
};

export const buildDockerImage = (
  name: string,
  version?: string | number
): string => `${name}:${version ?? 'latest'}`;

export const escapeBash = (cmd: string): string =>
  cmd.replace(/'/g, `\\` + `'`);

export const buildDockerfile = (
  image: string,
  cmd: string,
  copy = false
): string => {
  const escapedCmd = escapeBash(cmd);
  const statements = [
    `FROM ${image} AS base`,
    `WORKDIR /usr/src/app`,
    `RUN echo '${escapedCmd}' > /usr/bin/prescott_init && chmod +x /usr/bin/prescott_init`,
    ...(copy ? ['COPY . .'] : []),
    `CMD '/usr/bin/prescott_init'`,
  ];
  return statements.join('\n');
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

export const applyDockerLimitations = (
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

export const inspectContainer = async (
  container: string,
  params: InspectParam[]
): Promise<string[]> => {
  const formatBody = `"${params.map(buildContainerInspectParam).join(',')}"`;
  const command = new CommandBuilder()
    .init('docker inspect')
    .param('format', formatBody)
    .with(container);
  const { stdout } = await execDockerCommandWithCheck(container, command);
  return stdout.slice(0, -1).split(','); // exclude last '\n'
};

const INSPECT_MAP: Record<InspectParam, string> = {
  pid: '{{ .State.Pid }}',
  returned: '{{ .Status.ExitCode }}',
  status: '{{ .State.Status }}',
  startedAt: '{{ .State.StartedAt }}',
  finishedAt: '{{ .State.FinishedAt }}',
  retries: '{{ .RestartCount }}',
};

export const buildContainerInspectParam = (param: InspectParam): string => {
  const mappedParam = INSPECT_MAP[param];
  if (mappedParam !== undefined) {
    return mappedParam;
  } else throw new Error('Invalid inspect param');
};

export const getContainerPid = async (container: string): Promise<number> => {
  const [pid] = await inspectContainer(container, ['pid']);
  return parseInt(pid, 10);
};
