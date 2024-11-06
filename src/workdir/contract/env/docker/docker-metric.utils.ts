import { Transform, TransformCallback } from 'node:stream';
import { dockerSizeToBytes, removeEscapeCharacters } from './docker.utils';
import { MetricEntry } from '@src/modules/contract/model/metric/metric-entry';

// .split is faster than JSON.parse
const METRICS_SEPARATOR = '\t';
export const METRICS_FORMAT = `"{{.PIDs}}${METRICS_SEPARATOR}{{.MemUsage}}}${METRICS_SEPARATOR}{{.CPUPerc}}"`;
type RawDockerMetric = [string, string, string];

export class TransformDockerStatsToMetricEntryStream extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    const cleanStdout = removeEscapeCharacters(chunk.toString()).trim();
    if (cleanStdout === '') {
      callback();
      return;
    }

    for (const cleanLine of cleanStdout.split('\n')) {
      if (cleanLine === '') continue;
      const timestamp = Date.now();

      const rawMetric = cleanLine.split(METRICS_SEPARATOR) as RawDockerMetric;
      if (isEndOfMetrics(rawMetric)) {
        this.push(null); // end of stream
        break;
      }

      this.push(formatRawMetric(rawMetric, timestamp));
    }

    callback();
  }
}

const isEndOfMetrics = (rawMetric: RawDockerMetric): boolean => {
  return rawMetric[0] === '--' || rawMetric[0] === '0';
};

const formatRawMetric = (
  rawMetric: RawDockerMetric,
  timestamp: number
): MetricEntry => {
  const [, memUsage, cpuPercentage] = rawMetric;
  return {
    ram: dockerSizeToBytes(memUsage.split('/')[0].slice(0, -1)).toFixed(2), // exclude whitespace
    cpu: cpuPercentage.slice(0, -1), // exclude %
    time: timestamp,
  };
};
