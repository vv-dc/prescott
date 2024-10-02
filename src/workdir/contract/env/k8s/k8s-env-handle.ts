import { PassThrough } from 'node:stream';
import * as k8s from '@kubernetes/client-node';

import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
  WaitEnvHandleResult,
} from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';
import { makeK8sApiRequest } from '@src/workdir/contract/env/k8s/k8s-api.utils';
import { K8sPodStateWatch } from '@src/workdir/contract/env/k8s/k8s-pod-state-watch';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';

export class K8sEnvHandle implements EnvHandle {
  constructor(
    private readonly identifier: K8sPodIdentifier,
    private readonly stateWatch: K8sPodStateWatch,
    private readonly log: k8s.Log,
    private readonly metric: k8s.Metrics
  ) {}

  id() {
    return this.identifier.name;
  }

  async wait(): Promise<WaitEnvHandleResult> {
    await this.stateWatch.waitTerminal();
    return {
      exitCode: this.stateWatch.getExitCodeThrowable(),
      exitError: this.stateWatch.getExitError(),
    };
  }

  // there is no difference between stop and delete of pod in K8S
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stop(dto: StopEnvHandleDto): Promise<void> {
    // TODO: impl
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(dto: DeleteEnvHandleDto): Promise<void> {
    // TODO: impl
  }

  async *logs(): AsyncGenerator<LogEntry> {
    const { name, namespace, runnerContainer } = this.identifier;
    const logStream = new PassThrough();

    await makeK8sApiRequest(() =>
      this.log.log(namespace, name, runnerContainer, logStream, {
        follow: true,
        pretty: false,
        timestamps: true,
      })
    );

    // k8s doesn't separate stdout / stderr
    for await (const chunk of logStream) {
      const rawLogs = chunk.toString().split('\n');

      for (const rawLog of rawLogs) {
        yield {
          stream: 'stdout',
          time: Date.now(), // TODO: fixme parse from k8s
          content: rawLog,
        };
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *metrics(intervalMs?: number): AsyncGenerator<MetricEntry> {
    // while (this.watchResult !== null) {
    // TODO: collect metrics
    // }
  }
}
