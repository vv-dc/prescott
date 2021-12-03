import { CommandBuilder } from '@lib/command-builder';
import { Limitations } from '@model/domain/limitations';

export type LimitationMapper = (
  builder: CommandBuilder,
  value: string | number | true
) => void;

const LIMITATIONS_MAP: Record<keyof Limitations, LimitationMapper> = {
  ram: (builder, value) => {
    builder.param('memory', value);
  },
  rom: (builder, value) => {
    builder.param('storage-opt').with(`size=${value}`);
  },
  cpus: (builder: CommandBuilder, value) => {
    builder.param('cpus', value);
  },
  ttl: (builder, value) => {
    builder.prepend(`timeout ${value}`);
  },
};

export const buildImage = (name: string, version?: string | number): string =>
  `${name}:${version ?? 'latest'}`;

export const buildDockerfile = (
  image: string,
  cmd: string,
  copy = false
): string => {
  const statements = [
    `FROM ${image} AS base`,
    `WORKDIR /usr/src/app`,
    ...(copy ? ['COPY . .'] : []),
    `CMD ${escapeCmd(cmd)}`,
  ];
  return statements.join('\n');
};

export const buildLimitations = (
  builder: CommandBuilder,
  limitations: Limitations
): void => {
  for (const [limitation, value] of Object.entries(limitations)) {
    if (value !== undefined) {
      const mapper = LIMITATIONS_MAP[limitation as keyof Limitations];
      mapper(builder, value);
    }
  }
};

export const escapeCmd = (cmd: string): string => cmd.replace(/"/g, `\\"`);
