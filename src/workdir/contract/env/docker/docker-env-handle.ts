import { PassThrough, Readable, Writable } from 'node:stream';
import pidUsage = require('pidusage');

import { CommandBuilder } from '@lib/command-builder';
import { delay, millisecondsToSeconds } from '@lib/time.utils';
import {
  execDockerCommandWithCheck,
  getContainerPid,
  inspectDockerContainer,
} from '@src/workdir/contract/env/docker/docker.utils';
import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
  WaitEnvHandleResult,
} from '@modules/contract/model/env/env-handle';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import { errorToReason } from '@modules/errors/get-error-reason';
import { TranformRFC3339LogStream } from '@src/lib/log.utils';
import {
  METRICS_FORMAT,
  TransformDockerStatsToMetricEntryStream,
} from './docker-metric.utils';
import { mergeParallelStreams } from '@src/lib/stream.utils';

export class DockerEnvHandle implements EnvHandle {
  constructor(private container: string) {}

  id(): string {
    return this.container;
  }

  async stop(dto: StopEnvHandleDto): Promise<void> {
    const { timeout, signal } = dto;
    if (signal === 'timeout') {
      await this.killImpl(9); // some containers don't support 124
    } else {
      await this.stopImpl(timeout);
    }
  }

  private async stopImpl(timeout?: number): Promise<void> {
    const command = new CommandBuilder().init('docker stop');
    if (timeout) command.param('time', millisecondsToSeconds(timeout));

    await execDockerCommandWithCheck(
      this.container,
      command.with(this.container)
    );
  }

  private async killImpl(signal: number): Promise<void> {
    const command = new CommandBuilder()
      .init('docker kill')
      .param('signal', signal);
    await execDockerCommandWithCheck(
      this.container,
      command.with(this.container)
    );
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

  async wait(): Promise<WaitEnvHandleResult> {
    const command = new CommandBuilder().init('docker wait');
    try {
      const { stdout } = await execDockerCommandWithCheck(
        this.container,
        command.with(this.container)
      );
      const exitCode = parseInt(stdout.slice(0, -1), 10); // skip last \n
      return { exitCode, exitError: null };
    } catch (err) {
      const [exitCodeString] = await inspectDockerContainer(this.container, [
        'exitCode',
      ]);
      const exitCode = parseInt(exitCodeString, 10);
      return { exitCode, exitError: errorToReason(err) };
    }
  }

  async logs(): Promise<Readable> {
    const command = new CommandBuilder()
      .init('docker logs')
      .param('follow')
      .param('timestamps');
    const child = command.with(this.container).spawn();
    const streams: Readable[] = [];

    if (child.stdout) {
      const stdoutTransform = new TranformRFC3339LogStream('stdout');
      streams.push(child.stdout.pipe(stdoutTransform));
    }
    if (child.stderr) {
      const stderrTransform = new TranformRFC3339LogStream('stderr');
      streams.push(child.stderr.pipe(stderrTransform));
    }

    return mergeParallelStreams(streams, { objectMode: true });
  }

  async metrics(intervalMs?: number): Promise<Readable> {
    if (intervalMs) {
      return Readable.from(this.metricsInterval(intervalMs), {
        objectMode: true,
      });
    }
    return this.metricsContinuous();
  }

  private async *metricsInterval(
    intervalMs: number
  ): AsyncGenerator<MetricEntry> {
    const containerPid = await getContainerPid(this.container);
    if (containerPid === 0) return;

    try {
      while (true) {
        const { memory, cpu, timestamp } = await pidUsage(containerPid);
        yield {
          ram: memory.toFixed(2),
          cpu: cpu.toFixed(2),
          time: timestamp,
        };
        await delay(intervalMs);
      }
    } catch (err) {
      if ((await getContainerPid(this.container)) !== 0) {
        throw err;
      } // else ignore as the container was stopped
    }
  }

  private async metricsContinuous(): Promise<Readable> {
    const command = new CommandBuilder().init('docker stats');
    command.param('format', METRICS_FORMAT);
    command.param('no-trunc');

    const child = command.with(this.container).spawn();
    if (!child.stdout) return Readable.from([], { objectMode: true });

    const transformStream = new TransformDockerStatsToMetricEntryStream();
    return child.stdout.pipe(transformStream);
  }
}
