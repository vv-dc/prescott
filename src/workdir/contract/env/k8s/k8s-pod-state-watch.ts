import * as events from 'node:events';
import * as k8s from '@kubernetes/client-node';
import {
  inferAllWaitingContainersFailureReasonNullable,
  formatK8sReasonMessageByPodStatus,
  inferK8sPodExitCodeNullable,
} from '@src/workdir/contract/env/k8s/k8s.utils';
import { errorToReason } from '@modules/errors/get-error-reason';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { V1ContainerStatus, V1PodStatus } from '@kubernetes/client-node';

const enum PodLifeTimeEvent {
  'running' = 'running',
  'failed' = 'failed',
  'succeeded' = 'succeeded',
}

const DEFAULT_SUCCESS_EXIT_CODE = 0;
const DEFAULT_FAILURE_EXIT_CODE = 1;

export class K8sPodStateWatch {
  private readonly emitter = new events.EventEmitter();
  private watchResult: k8s.WatchResult | null = null; // null - watch is not started, or pod finished running
  private exitCode: number | null = null; // null - still running

  constructor(
    private readonly identifier: K8sPodIdentifier,
    private readonly watch: k8s.Watch
  ) {}

  // https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase
  async start(): Promise<void> {
    this.watchResult = await this.watch.watch(
      `/api/v1/namespaces/${this.identifier.namespace}/pods`,
      {
        fieldSelector: `metadata.name=${this.identifier.name}`,
      },
      (updateType: string, pod: k8s.V1Pod) => {
        if (!['ADDED', 'MODIFIED'].includes(updateType) || !pod.status?.phase) {
          return; // wait until next update
        }
        const { phase, containerStatuses = [] } = pod.status;

        switch (phase) {
          case 'Pending':
          case 'Unknown':
            return this.handlePendingPhase(containerStatuses);
          case 'Running':
            return this.handleRunningPhase();
          default: // all other events are terminal
            return this.handleTerminalPhase(
              phase,
              containerStatuses,
              pod.status
            );
        }
      },
      (err) => {
        // watch abort is also recognized as error and is passed here, so it should be skipped
        if (err && !this.isTerminal()) {
          const reason = errorToReason(err);
          this.setFailed(reason, DEFAULT_FAILURE_EXIT_CODE);
        }
      }
    );
  }

  private handlePendingPhase(containerStatuses: V1ContainerStatus[]): void {
    if (containerStatuses.length === 0) {
      return;
    }

    const reasonNullable =
      inferAllWaitingContainersFailureReasonNullable(containerStatuses);
    if (reasonNullable !== null) {
      const exitCodeNullable = inferK8sPodExitCodeNullable(
        containerStatuses,
        this.identifier.runnerContainer
      );
      this.stopIfApplicable(); // no need to wait - container already failed
      this.setFailed(reasonNullable, exitCodeNullable ?? 1);
    }
  }

  private handleRunningPhase() {
    this.setRunning();
  }

  private handleTerminalPhase(
    phase: string,
    containerStatuses: V1ContainerStatus[],
    podStatus: V1PodStatus
  ): void {
    this.stopIfApplicable();
    const exitCodeNullable = inferK8sPodExitCodeNullable(
      containerStatuses,
      this.identifier.runnerContainer
    );

    if (phase === 'Failed') {
      const reason = formatK8sReasonMessageByPodStatus(podStatus);
      this.setFailed(reason, exitCodeNullable ?? DEFAULT_FAILURE_EXIT_CODE);
    } else {
      this.setSucceed(exitCodeNullable ?? DEFAULT_SUCCESS_EXIT_CODE);
    }
  }

  private stopIfApplicable() {
    if (this.watchResult !== null) {
      this.watchResult.abort();
      this.watchResult = null;
    }
  }

  getExitCodeThrowable(): number {
    if (!this.isTerminal()) {
      throw new Error('Pod is not terminal - exitCode is not available');
    }
    return this.exitCode as number;
  }

  isTerminal(): boolean {
    return this.exitCode !== null;
  }

  private setRunning(): void {
    this.emitter.emit(PodLifeTimeEvent.running);
  }

  private setSucceed(exitCode: number) {
    this.exitCode = exitCode;
    this.emitter.emit(PodLifeTimeEvent.succeeded, exitCode);
  }

  private setFailed(reason: string, exitCode: number): void {
    this.exitCode = exitCode;
    this.emitter.emit(PodLifeTimeEvent.failed, new Error(reason));
  }

  async waitNonPending(): Promise<void> {
    if (this.isTerminal()) {
      return;
    }
    return new Promise((resolve, reject) => {
      this.emitter.once(PodLifeTimeEvent.running, () => resolve());
      this.emitter.once(PodLifeTimeEvent.succeeded, () => resolve());
      this.emitter.once(PodLifeTimeEvent.failed, (err) => reject(err));
    });
  }

  async waitTerminal(): Promise<void> {
    if (this.isTerminal()) {
      return;
    }
    return new Promise((resolve, reject) => {
      this.emitter.once(PodLifeTimeEvent.succeeded, () => resolve());
      this.emitter.once(PodLifeTimeEvent.failed, (err) => reject(err));
    });
  }
}
