import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { ContractOpts } from '@modules/contract/model/contract';
import {
  BuildEnvDto,
  DeleteEnvDto,
  EnvBuilderContract,
} from '@modules/contract/model/env/env-builder.contract';
import { generateRandomString } from '@lib/random.utils';
import {
  buildDockerfile,
  buildDockerImage,
  execDockerCommandWithCheck,
} from '@src/workdir/contract/env/docker/docker.utils';
import { CommandBuilder } from '@lib/command-builder';

// TODO: add push to registry
const config = {
  workDir: process.env.PRESCOTT_WORKDIR || '',
} as ContractOpts;

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const buildEnv = async (dto: BuildEnvDto): Promise<string> => {
  const dockerfileName = generateRandomString('dockerfile');
  const dockerfilePath = path.join(config.workDir, dockerfileName);
  try {
    return await buildEnvImpl(dto, dockerfilePath);
  } finally {
    await fs.rm(dockerfilePath).catch();
  }
};

const buildEnvImpl = async (
  dto: BuildEnvDto,
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

const deleteEnv = async (dto: DeleteEnvDto): Promise<void> => {
  const { envId: image, isForce } = dto;
  const command = new CommandBuilder().init('docker rmi');
  if (isForce) command.param('force');
  await execDockerCommandWithCheck(image, command.with(image));
};

const envBuilder: EnvBuilderContract = {
  init,
  buildEnv,
  deleteEnv,
};

export default {
  buildContract: async () => envBuilder,
};
