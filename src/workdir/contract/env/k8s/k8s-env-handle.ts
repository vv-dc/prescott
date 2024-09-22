import {
  DeleteEnvHandleDto,
  EnvHandle,
  StopEnvHandleDto,
} from '@modules/contract/model/env/env-handle';
import { LogEntry } from '@modules/contract/model/log/log-entry';
import { MetricEntry } from '@modules/contract/model/metric/metric-entry';

export class K8sEnvHandle implements EnvHandle {
  constructor(private readonly podId: string) {}

  id() {
    return this.podId;
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

  async wait(): Promise<number> {
    return 42;
  }

  async *logs(): AsyncGenerator<LogEntry> {
    // TODO: impl
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *metrics(intervalMs?: number): AsyncGenerator<MetricEntry> {
    // TODO: impl
  }
}
