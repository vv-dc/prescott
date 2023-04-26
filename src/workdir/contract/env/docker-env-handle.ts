import pidUsage = require('pidusage');

import { CommandBuilder } from '@lib/command-builder';
import { delay } from '@lib/time.utils';
import {
  execDockerCommandWithCheck,
  dockerSizeToBytes,
  getContainerPid,
  removeEscapeCharacters,
} from '@src/workdir/contract/env/docker.utils';
import {
  DeleteEnvHandleDto,
  EnvHandle,
  KillEnvHandleDto,
  StopEnvHandleDto,
} from '@modules/contract/model/env-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import { MetricEntry } from '@modules/contract/model/metric-entry';

// .split is faster than JSON.parse
const METRICS_SEPARATOR = '\t';
const METRICS_FORMAT = `"{{.PIDs}}${METRICS_SEPARATOR}{{.MemUsage}}}${METRICS_SEPARATOR}{{.CPUPerc}}"`;

type RawDockerMetric = [string, string, string];

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

  async kill(dto: KillEnvHandleDto): Promise<void> {
    const { signal } = dto;
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

  async wait(): Promise<number> {
    const command = new CommandBuilder().init('docker wait');
    const { stdout } = await execDockerCommandWithCheck(
      this.container,
      command.with(this.container)
    );
    return parseInt(stdout.slice(0, -1), 10); // skip last \n
  }

  async *logs(): AsyncGenerator<LogEntry> {
    const command = new CommandBuilder().init('docker logs');
    command.param('follow');
    command.with(this.container);

    const child = command.spawn();

    if (child.stdout) {
      for await (const stdout of child.stdout) {
        yield { type: 'stdout', content: stdout.toString(), time: new Date() };
      }
    }
    if (child.stderr) {
      for await (const stderr of child.stderr) {
        yield { type: 'stderr', content: stderr.toString(), time: new Date() };
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
        const { memory, cpu, timestamp } = await pidUsage(containerPid);
        yield {
          ram: memory.toFixed(2),
          cpu: cpu.toFixed(2),
          time: timestamp.toString(),
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
    command.param('format', METRICS_FORMAT);
    command.param('no-trunc');

    const child = command.with(this.container).spawn();
    if (!child.stdout) return;

    for await (const stdout of child.stdout) {
      const cleanStdout = removeEscapeCharacters(stdout.toString()).trim();
      if (cleanStdout === '') continue;

      for (const cleanPart of cleanStdout.split('\n')) {
        if (cleanPart === '') continue;
        const timestamp = Date.now();

        const rawMetric = cleanPart.split(METRICS_SEPARATOR) as RawDockerMetric;
        if (this.isEndOfMetrics(rawMetric)) return;
        yield this.formatRawMetric(rawMetric, timestamp);
      }
    }
  }

  private isEndOfMetrics(rawMetric: RawDockerMetric): boolean {
    return rawMetric[0] === '--' || rawMetric[0] === '0';
  }

  private formatRawMetric(
    rawMetric: RawDockerMetric,
    timestamp: number
  ): MetricEntry {
    const [, memUsage, cpuPercentage] = rawMetric;
    return {
      ram: dockerSizeToBytes(memUsage.split('/')[0].slice(0, -1)).toFixed(2), // exclude whitespace
      cpu: cpuPercentage.slice(0, -1), // exclude %
      time: timestamp.toString(),
    };
  }
}
