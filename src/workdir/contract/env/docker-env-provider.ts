import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';

import { generateRandomString } from '@lib/random.utils';
import {
  applyDockerLimitations,
  applyDockerRunOptions,
  buildDockerfile,
  buildDockerImage,
  normalizeDockerContainerName,
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
  workDir: process.env.PRESCOTT_WORKDIR || '',
};

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const compileEnv = async (dto: CompileEnvDto): Promise<string> => {
  const dockerfileName = generateRandomString('dockerfile');
  const dockerfilePath = path.join(config.workDir, dockerfileName);
  try {
    return await compileEnvImpl(dto, dockerfilePath);
  } finally {
    await fs.rm(dockerfilePath).catch();
  }
};

const compileEnvImpl = async (
  dto: CompileEnvDto,
  dockerfilePath: string
): Promise<string> => {
  const { envInfo, script, isCache, alias: imageTag } = dto;
  const { name, version } = envInfo;

  const baseImage = buildDockerImage(name, version);
  const dockerfile = buildDockerfile(baseImage, script, false);
  await fs.writeFile(dockerfilePath, dockerfile);

  const command = new CommandBuilder()
    .init('docker build')
    .param('tag', imageTag)
    .with('- <') // ignore context
    .with(dockerfilePath); // read from dockerfile

  if (!isCache) command.param('no-cache');
  await execDockerCommandWithCheck(imageTag, command);

  return imageTag;
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
      // some containers don't support 124
      await envHandle.kill({ signal: 9, reason: 'TTL elapsed' });
    }, limitations.ttl);
  }

  return envHandle;
};

const deleteEnv = async (dto: DeleteEnvDto): Promise<void> => {
  const { envId: image, isForce } = dto;
  const command = new CommandBuilder().init('docker rmi');
  if (isForce) command.param('force');
  await execDockerCommandWithCheck(image, command.with(image));
};

// docker searches containers not for exact match, by rather by BASE image
const getEnvChildren = async (envId: EnvId): Promise<string[]> => {
  const command = new CommandBuilder()
    .init('docker container ls')
    .arg('a')
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
