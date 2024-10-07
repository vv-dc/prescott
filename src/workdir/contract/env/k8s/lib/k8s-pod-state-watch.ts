import * as events from 'node:events';
import * as k8s from '@kubernetes/client-node';

import {
  inferAllWaitingContainersFailureReasonNullable,
  inferK8sPodExitCodeNullable,
  inferK8sTerminatedPodReasonNullable,
} from '@src/workdir/contract/env/k8s/lib/k8s-api.utils';
import { errorToReason } from '@modules/errors/get-error-reason';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';

const enum PodLifeTimeEvent {
  'running' = 'running', // container was created but still running
  'failed' = 'failed', // container failed during execution (exit_code != 0) or creation (ErrImageNeverPull)
  'succeeded' = 'succeeded', // container executed successfully
}

const DEFAULT_SUCCESS_EXIT_CODE = 0;
const DEFAULT_FAILURE_EXIT_CODE = 1;

export class K8sPodStateWatch {
  private readonly emitter = new events.EventEmitter();
  private watchResult: k8s.WatchResult | null = null; // null - watch is not started, or pod finished running

  private initError: string | null = null; // error throw during container initialization (ImagePullErr etc.)
  private exitCode: number | null = null; // null - container never exited
  private exitError: string | null = null;

  constructor(
    private readonly identifier: K8sPodIdentifier,
    private readonly watch: k8s.Watch
  ) {}

  getInitError(): string | null {
    return this.initError;
  }

  getExitCodeThrowable(): number {
    if (!this.isStateTerminal()) {
      throw new Error('Pod is not terminal - exitCode is not available');
    }
    return this.exitCode as number;
  }

  getExitError(): string | null {
    return this.exitError;
  }

  // https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase
  async start(): Promise<void> {
    this.watchResult = await this.watch.watch(
      `/api/v1/namespaces/${this.identifier.namespace}/pods`,
      {
        fieldSelector: `metadata.name=${this.identifier.name}`,
      },
      (updateType: string, pod: k8s.V1Pod) => {
        if (
          !['ADDED', 'MODIFIED', 'DELETED'].includes(updateType) ||
          !pod.status?.phase
        ) {
          return; // wait until next update
        }
        const { phase, containerStatuses = [] } = pod.status;

        // pod can be deleted in any of active/terminal states
        if (
          updateType === 'DELETED' &&
          !['Succeed', 'Failed'].includes(phase)
        ) {
          return this.handleTerminalPhase(
            'Failed',
            containerStatuses,
            pod.status
          );
        }

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
        if (err && !this.isStateTerminal()) {
          const reason = errorToReason(err);
          this.setRunFailed(DEFAULT_FAILURE_EXIT_CODE, reason);
        }
      }
    );
  }

  private handlePendingPhase(containerStatuses: k8s.V1ContainerStatus[]): void {
    if (containerStatuses.length === 0) {
      return;
    }

    const reasonNullable =
      inferAllWaitingContainersFailureReasonNullable(containerStatuses);
    if (reasonNullable !== null) {
      this.stopIfApplicable(); // no need to wait - container already failed
      this.setInitFailed(reasonNullable);
    }
  }

  private handleRunningPhase() {
    this.setRunning();
  }

  private handleTerminalPhase(
    phase: string,
    containerStatuses: k8s.V1ContainerStatus[],
    podStatus: k8s.V1PodStatus
  ): void {
    this.stopIfApplicable();
    const exitCodeNullable = inferK8sPodExitCodeNullable(
      containerStatuses,
      this.identifier.runnerContainer
    );

    if (phase === 'Failed') {
      const reasonNullable = inferK8sTerminatedPodReasonNullable(
        podStatus,
        this.identifier.runnerContainer
      );
      this.setRunFailed(
        exitCodeNullable ?? DEFAULT_FAILURE_EXIT_CODE,
        reasonNullable ?? 'Unknown'
      );
    } else {
      this.setRunSucceeded(exitCodeNullable ?? DEFAULT_SUCCESS_EXIT_CODE);
    }
  }

  stopIfApplicable() {
    if (this.watchResult !== null) {
      this.watchResult.abort();
      this.watchResult = null;
    }
  }

  isStateTerminal(): boolean {
    return this.exitCode !== null;
  }

  private setRunning(): void {
    this.emitter.emit(PodLifeTimeEvent.running);
  }

  private setRunSucceeded(exitCode: number) {
    this.exitCode = exitCode;
    this.emitter.emit(PodLifeTimeEvent.succeeded);
  }

  private setRunFailed(exitCode: number, reason: string): void {
    this.exitCode = exitCode;
    this.exitError = reason;
    this.emitter.emit(PodLifeTimeEvent.failed);
  }

  private setInitFailed(reason: string): void {
    this.exitCode = DEFAULT_FAILURE_EXIT_CODE; // there is no exit code, because container was not started
    this.initError = reason;
    this.emitter.emit(PodLifeTimeEvent.failed);
  }

  waitNonPending(): Promise<void> {
    if (this.isStateTerminal()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.emitter.once(PodLifeTimeEvent.running, () => resolve());
      this.emitter.once(PodLifeTimeEvent.succeeded, () => resolve());
      this.emitter.once(PodLifeTimeEvent.failed, () => resolve());
    });
  }

  waitTerminal(): Promise<void> {
    if (this.isStateTerminal()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.emitter.once(PodLifeTimeEvent.succeeded, () => resolve());
      this.emitter.once(PodLifeTimeEvent.failed, () => resolve());
    });
  }
}
