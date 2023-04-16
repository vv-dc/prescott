import { generateRandomString } from '@lib/random.utils';
import {
  applyDockerRunOptions,
  applyDockerLimitations,
  buildDockerImage,
  buildDockerfile,
  execDockerCommandWithCheck,
} from '@src/workdir/contract/env/docker.utils';
import {
  CompileEnvDto,
  DeleteEnvDto,
  EnvId,
  EnvProviderContract,
  RunEnvDto,
} from '@modules/contract/model/env-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { ContractOpts } from '@modules/contract/model/contract';
import { CommandBuilder } from '@lib/command-builder';
import { DockerEnvHandle } from '@src/workdir/contract/env/docker-env-handle';

const config = {
  workDir: '',
};

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const runEnv = async (dto: RunEnvDto): Promise<EnvHandle> => {
  const { limitations, envId: image, options } = dto;

  const container = generateRandomString(image);
  const command = new CommandBuilder()
    .init('docker run')
    .param('name', container);

  if (limitations) applyDockerLimitations(command, limitations);
  applyDockerRunOptions(command, options);

  await execDockerCommandWithCheck(image, command.with(image));
  return new DockerEnvHandle(container);
};

const compileEnv = async (dto: CompileEnvDto): Promise<string> => {
  const { envInfo, script, isCache, alias } = dto;
  const { name, version } = envInfo;

  const baseImage = buildDockerImage(name, version);
  const dockerfile = buildDockerfile(baseImage, script, false);
  const imageTag = generateRandomString(alias);

  const command = new CommandBuilder()
    .init('printf')
    .with(`"${dockerfile}"`)
    .pipe('docker build')
    .param('tag', imageTag);

  if (!isCache) command.param('no-cache');
  await execDockerCommandWithCheck(imageTag, command.with('-'));

  return imageTag;
};

const deleteEnv = async (dto: DeleteEnvDto): Promise<void> => {
  const { envId: image, isForce } = dto;
  const command = new CommandBuilder().init('docker rmi');
  if (isForce) command.param('force');
  await execDockerCommandWithCheck(image, command.with(image));
};

const getEnvChildren = async (envId: EnvId): Promise<string[]> => {
  const command = new CommandBuilder()
    .init('docker ps')
    .arg('a')
    .arg('q')
    .param('filter')
    .with(`ancestor=${envId}`);
  const { stdout } = await execDockerCommandWithCheck(envId, command);
  return stdout.split('\n').slice(0, -1);
};

const getEnvHandle = async (handleId: string): Promise<EnvHandle> => {
  return new DockerEnvHandle(handleId);
};

const envProvider: EnvProviderContract = {
  init,
  runEnv,
  compileEnv,
  deleteEnv,
  getEnvChildren,
  getEnvHandle,
};

export default {
  buildContract: async () => envProvider,
};
