import * as pidUsage from 'pidusage';
import { processExists } from '@lib/shell.utils';
import { delay } from '@lib/time.utils';
import {
  execDockerCommandWithCheck,
  getContainerPid,
} from '@src/workdir/contract/env/docker.utils';
import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
} from '@modules/contract/model/env-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import { MetricEntry } from '@modules/contract/model/metric-entry';
import { CommandBuilder } from '@lib/command-builder';

export class DockerEnvHandle implements EnvHandle {
  constructor(private container: string) {}

  id(): string {
    return this.container;
  }

  async stop(dto: StopEnvHandleDto): Promise<void> {
    const { timeout } = dto;
    const command = new CommandBuilder()
      .init('docker stop')
      .with(this.container);
    if (timeout) command.prepend(`sleep ${timeout} &&`);
    await execDockerCommandWithCheck(this.container, command);
  }

  async delete(dto: DeleteEnvHandleDto): Promise<void> {
    const { isForce } = dto;
    const command = new CommandBuilder().init('docker rm');
    if (isForce) command.param('force');
    await execDockerCommandWithCheck(
      this.container,
      command.with(this.container)
    );
  }

  async *logs(): AsyncGenerator<LogEntry> {
    const command = new CommandBuilder().init('docker logs');
    command.param('follow');
    command.prepend(this.container);

    const child = command.exec();

    if (child.stdout) {
      for await (const stdout of child.stdout) {
        yield { type: 'stdout', content: stdout, date: new Date() };
      }
    }
    if (child.stderr) {
      for await (const stderr of child.stderr) {
        yield { type: 'stderr', content: stderr, date: new Date() };
      }
    }
  }

  async *metrics(intervalMs: number): AsyncGenerator<MetricEntry> {
    const pid = await getContainerPid(this.container);
    if (pid === 0) return; // container is down already
    while (processExists(pid)) {
      yield (await pidUsage(pid)) as unknown as MetricEntry;
      await delay(intervalMs);
    }
  }
}
