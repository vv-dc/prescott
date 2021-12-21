import { knexConfig } from '../../knexfile';
import { buildImage } from '@plugins/docker/docker.utils';
import { buildPgConnection } from '@modules/database/build-pg';
import { CommandBuilder } from '@lib/command-builder';
import { PgConnection } from '@model/shared/pg-connection';
import { OsInfo } from '@model/domain/os-info';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { Step, TaskConfigDto } from '@model/dto/task-config.dto';

export const getTimeoutRejectPromise = (timeout: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout elapsed'));
    }, timeout);
  });

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

export const buildLocalTask = (
  name: string,
  steps: Step[],
  cronString: string,
  once = false
): TaskConfigDto => ({
  name,
  osInfo: DOCKER_IMAGES.alpine,
  once,
  config: {
    local: { cronString },
    appConfig: {
      steps,
      limitations: {},
    },
  },
});
