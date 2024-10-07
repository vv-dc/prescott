import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';
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
  formatDockerLabel,
  normalizeDockerContainerName,
} from '@src/workdir/contract/env/docker/docker.utils';
import { generateRandomString } from '@lib/random.utils';
import { CommandBuilder } from '@lib/command-builder';
import { errorToReason } from '@modules/errors/get-error-reason';
import { getLogger } from '@logger/logger';

const logger = getLogger('docker-env-runner');
const config = {} as { workDir: string };

const PRESCOTT_ORIGIN_LABEL_KEY = 'prescott.origin';

const init = async (opts: ContractInitOpts): Promise<void> => {
  config.workDir = opts.system.workDir;
};

const runEnv = async (dto: RunEnvDto): Promise<EnvHandle> => {
  // TODO: handle script
  const { limitations, envKey: image, options, label } = dto;

  const safeImage = normalizeDockerContainerName(image);
  const container = generateRandomString(safeImage);
  const command = new CommandBuilder()
    .init('docker run')
    .param('name', container)
    .param('label', formatDockerLabel(PRESCOTT_ORIGIN_LABEL_KEY, label))
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
const getEnvChildrenHandleIds = async (label: string): Promise<string[]> => {
  const labelString = formatDockerLabel(PRESCOTT_ORIGIN_LABEL_KEY, label);
  const command = new CommandBuilder()
    .init('docker ps')
    .param('format', `"{{.Names}}"`)
    .param('filter', `"label=${labelString}"`);
  const { stdout } = await execDockerCommandWithCheck(label, command);
  return stdout.split('\n').slice(0, -1); // exclude last '\n'
};

const getEnvHandle = async (handleId: string): Promise<EnvHandle> => {
  return new DockerEnvHandle(handleId);
};

const envRunner: EnvRunnerContract = {
  init,
  runEnv,
  getEnvHandle,
  getEnvChildrenHandleIds,
};

export default {
  buildContract: async () => envRunner,
} satisfies ContractModule;
