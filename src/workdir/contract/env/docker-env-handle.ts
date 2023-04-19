import pidUsage = require('pidusage');

import { CommandBuilder } from '@lib/command-builder';
import { delay } from '@lib/time.utils';
import {
  execDockerCommandWithCheck,
  formatDockerBytes,
  getContainerPid,
  removeEscapeCharacters,
} from '@src/workdir/contract/env/docker.utils';
import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
} from '@modules/contract/model/env-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import { MetricEntry } from '@modules/contract/model/metric-entry';

export class DockerEnvHandle implements EnvHandle {
  constructor(private container: string) {}

  id(): string {
    return this.container;
  }

  async stop(dto: StopEnvHandleDto): Promise<void> {
    const { timeout } = dto;
    const command = new CommandBuilder().init('docker stop');
    if (timeout) command.param('time', timeout);

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

  async *logs(): AsyncGenerator<LogEntry> {
    const command = new CommandBuilder().init('docker logs');
    command.param('follow');
    command.with(this.container);

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

  metrics(intervalMs?: number): AsyncGenerator<MetricEntry> {
    return intervalMs
      ? this.metricsInterval(intervalMs)
      : this.metricsContinuous();
  }

  private async *metricsInterval(
    intervalMs: number
  ): AsyncGenerator<MetricEntry> {
    const containerPid = await getContainerPid(this.container);
    if (containerPid === 0) return;

    try {
      while (true) {
        const { memory, cpu, elapsed } = await pidUsage(containerPid);
        yield {
          ram: formatDockerBytes(memory),
          cpu: cpu.toFixed(3),
          elapsed: elapsed.toString(),
        };
        await delay(intervalMs);
      }
    } catch (err) {
      if ((await getContainerPid(this.container)) !== 0) {
        throw err;
      } // else ignore as the container was stopped
    }
  }

  private async *metricsContinuous(): AsyncGenerator<MetricEntry> {
    const command = new CommandBuilder().init('docker stats');
    command.param('format', '"{{ json . }}"');
    command.param('no-trunc');

    const child = command.with(this.container).exec();
    if (!child.stdout) return;
    const startTime = Date.now();

    for await (const stdout of child.stdout) {
      const cleanStdout = removeEscapeCharacters(stdout).trim();
      if (cleanStdout === '') continue;

      for (const cleanPart of cleanStdout.split('\n')) {
        if (cleanPart === '') continue;

        const elapsed = Date.now() - startTime;
        const rawMetric = JSON.parse(cleanPart);

        if (this.isEndOfMetrics(rawMetric)) return;
        yield this.formatRawMetric(rawMetric, elapsed);
      }
    }
  }

  private formatRawMetric(
    rawMetric: Record<string, string>,
    elapsedMs: number
  ): MetricEntry {
    return {
      ram: rawMetric['MemUsage'].split('/')[0].trim(),
      cpu: parseInt(rawMetric['CPUPerc'], 10).toFixed(3),
      elapsed: elapsedMs.toString(),
    };
  }

  private isEndOfMetrics(rawMetric: Record<string, string>): boolean {
    return rawMetric['PIDs'] === '--' || rawMetric['PIDs'] === '0';
  }
}
