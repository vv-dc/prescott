import { randomUUID } from 'crypto';
import { PgConnection } from '@model/shared/pg-connection';
import { buildPgConnection } from '@plugins/pg';
import { knexConfig } from '../../knexfile';
import { OsInfo } from '@model/domain/os-info';
import { DockerService } from '@plugins/docker/docker.service';
import { buildDockerfile, buildImage } from '@plugins/docker/docker.utils';
import { CommandBuilder } from '@lib/command-builder';
import { getVersion } from 'jest';

export const getTimeoutRejectPromise = (timeout: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout elapsed'));
    }, timeout);
  });

export const generateRandomString = (prefix?: string): string =>
  (prefix ? `${prefix}_` : '') + randomUUID();

export const getConnection = (): PgConnection => buildPgConnection(knexConfig);

export const pullImages = async (images: OsInfo[]): Promise<void> => {
  for (const { name, version } of images) {
    const image = buildImage(name, version);
    const command = new CommandBuilder().init('docker pull').with(image);
    await command.execAsync();
  }
};

export const deleteImages = async (images: OsInfo[]): Promise<void> => {
  for (const { name, version } of images) {
    const image = buildImage(name, version);
    const command = new CommandBuilder().init('docker rmi').with(image);
    await command.execAsync();
  }
};
