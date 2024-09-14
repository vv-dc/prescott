import { ContractOpts } from '@modules/contract/model/contract';
import {
  EnvRunnerContract,
  RunEnvDto,
} from '@modules/contract/model/env/env-runner.contract';
import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { DockerEnvHandle } from '@src/workdir/contract/env/docker/docker-env-handle';
import {
  applyDockerLimitations,
  applyDockerRunOptions,
  execDockerCommandWithCheck,
  normalizeDockerContainerName,
} from '@src/workdir/contract/env/docker/docker.utils';
import { generateRandomString } from '@lib/random.utils';
import { CommandBuilder } from '@lib/command-builder';
import { errorToReason } from '@modules/errors/get-error-reason';
import { getLogger } from '@logger/logger';
import { EnvId } from '@modules/contract/model/env/env-id';

const logger = getLogger('docker-env-runner');
const config = {
  workDir: process.env.PRESCOTT_WORKDIR || '',
} as ContractOpts;

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const runEnv = async (dto: RunEnvDto): Promise<EnvHandle> => {
  const { limitations, envId: image, options } = dto;

  const safeImage = normalizeDockerContainerName(image);
  const container = generateRandomString(safeImage);
  const command = new CommandBuilder()
    .init('docker run')
    .param('name', container)
    .param('log-driver', 'local')
    .param('detach');

  if (limitations) applyDockerLimitations(command, limitations);
  applyDockerRunOptions(command, options);

  await execDockerCommandWithCheck(image, command.with(image));
  const envHandle = new DockerEnvHandle(container);

  if (limitations?.ttl) {
    setTimeout(async () => {
      try {
        await envHandle.stop({ signal: 'timeout' });
      } catch (err) {
        const reason = errorToReason(err);
        logger.warn(
          `runEnv[handleId=${envHandle.id()} - unable to stop on TTL - ${reason}`
        );
      }
    }, limitations.ttl);
  }

  return envHandle;
};

// docker searches containers not for exact match, by rather by BASE image
const getEnvChildren = async (envId: EnvId): Promise<string[]> => {
  const command = new CommandBuilder()
    .init('docker container ls')
    .param('format', `"{{.Names}}\t{{.Image}}"`)
    .param('filter')
    .with(`ancestor=${envId}`);
  const { stdout } = await execDockerCommandWithCheck(envId, command);
  const rows: Array<[string, string]> = stdout
    .split('\n')
    .slice(0, -1) // exclude last '\n'
    .map((row) => row.split('\t') as [string, string]);
  return rows.filter((row) => row[1] === envId).map((row) => row[0]);
};

const getEnvHandle = async (handleId: string): Promise<EnvHandle> => {
  return new DockerEnvHandle(handleId);
};

const envRunner: EnvRunnerContract = {
  init,
  runEnv,
  getEnvHandle,
  getEnvChildrenHandleIds: getEnvChildren,
};

export default {
  buildContract: async () => envRunner,
};
