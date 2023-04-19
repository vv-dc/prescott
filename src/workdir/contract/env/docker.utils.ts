import { CommandBuilder } from '@lib/command-builder';
import {
  EnvId,
  RunEnvOptions,
} from '@modules/contract/model/env-provider.contract';
import { Limitations } from '@model/domain/limitations';
import { MappedLimitation } from '@src/workdir/contract/env/model/mapped-limitation';
import { BuilderMapper } from '@src/workdir/contract/env/model/builder-mapper';
import { InspectParam } from '@src/workdir/contract/env/model/inspect-param';

export class DockerEnvError extends Error {
  constructor(private resourceId: string | EnvId, message: string) {
    super(message);
  }
}

export const execDockerCommandWithCheck = async (
  entityId: string,
  command: CommandBuilder
): Promise<{ stdout: string; stderr: string }> => {
  const { stdout, stderr, child } = await command.execAsync();
  if (child.exitCode !== 0) {
    throw new DockerEnvError(entityId, stderr);
  }
  return { stdout, stderr };
};

export const applyDockerRunOptions = (
  builder: CommandBuilder,
  options: RunEnvOptions
): void => {
  const { isDelete } = options;
  if (isDelete) builder.param('rm');
};

export const buildDockerImage = (
  name: string,
  version?: string | number
): string => `${name}:${version ?? 'latest'}`;

export const removeEscapeCharacters = (str: string) =>
  // eslint-disable-next-line no-control-regex
  str.replace(/\x1b\[[0-9]?[J,H]/g, '');

export const formatDockerBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const pow = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, pow)).toFixed(3))} ${sizes[pow]}`;
};

export const normalizeDockerContainerName = (name: string): string =>
  name.replaceAll(':', '_');

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

export const inspectDockerContainer = async (
  container: string,
  params: InspectParam[]
): Promise<string[]> => {
  const formatBody = `"${params.map(buildContainerInspectParam).join(',')}"`;
  const command = new CommandBuilder()
    .init('docker container inspect')
    .param('format', formatBody)
    .with(container);
  const { stdout } = await execDockerCommandWithCheck(container, command);
  return stdout.slice(0, -1).split(','); // exclude last '\n'
};

const INSPECT_MAP: Record<InspectParam, string> = {
  pid: '{{ .State.Pid }}',
  exitCode: '{{ .State.ExitCode }}',
  status: '{{ .State.Status }}',
  startedAt: '{{ .State.StartedAt }}',
  finishedAt: '{{ .State.FinishedAt }}',
  retries: '{{ .RestartCount }}',
};

export const isDockerResourceExist = async (
  resource: string
): Promise<boolean> => {
  try {
    const command = new CommandBuilder()
      .init('docker inspect')
      .with(resource)
      .param('format', `"{{.Id}}"`);
    await execDockerCommandWithCheck(resource, command);
    return true;
  } catch (err) {
    return false;
  }
};

export const buildContainerInspectParam = (param: InspectParam): string => {
  const mappedParam = INSPECT_MAP[param];
  if (mappedParam !== undefined) {
    return mappedParam;
  } else throw new Error('Invalid inspect param');
};

export const getContainerPid = async (container: string): Promise<number> => {
  try {
    const [pid] = await inspectDockerContainer(container, ['pid']);
    return parseInt(pid, 10);
  } catch (err) {
    return 0;
  }
};
