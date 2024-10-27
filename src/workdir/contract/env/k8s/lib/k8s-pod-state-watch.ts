import * as events from 'node:events';
import * as k8s from '@kubernetes/client-node';

import {
  inferK8sTerminatedPodTerminationDetailsNullable,
  inferK8sWaitingPodTerminationDetailsNullable,
} from '@src/workdir/contract/env/k8s/lib/k8s-api.utils';
import { errorToReason } from '@modules/errors/get-error-reason';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { PRESCOTT_K8S_POD_CONST } from '../model/k8s-const';

const enum PodLifeTimeEvent {
  'running' = 'running', // container was created but still running
  'failed' = 'failed', // container failed during execution (exit_code != 0) or creation (ErrImageNeverPull)
  'succeeded' = 'succeeded', // container executed successfully
}

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
        const { phase } = pod.status;

        // pod can be deleted in any of active/terminal states
        if (
          updateType === 'DELETED' &&
          !['Succeed', 'Failed'].includes(phase)
        ) {
          return this.handleTerminalPhase('Failed', pod.status);
        }

        switch (phase) {
          case 'Pending':
          case 'Unknown':
            return this.handlePendingPhase(pod.status);
          case 'Running':
            return this.handleRunningPhase();
          default: // all other events are terminal
            return this.handleTerminalPhase(phase, pod.status);
        }
      },
      (err) => {
        // watch abort is also recognized as error and is passed here, so it should be skipped
        if (err && !this.isStateTerminal()) {
          const reason = errorToReason(err);
          this.setRunFailed(PRESCOTT_K8S_POD_CONST.FAILURE_EXIT_CODE, reason);
        }
      }
    );
  }

  private handlePendingPhase(podStatus: k8s.V1PodStatus): void {
    const terminationDetails = inferK8sWaitingPodTerminationDetailsNullable(
      podStatus,
      this.identifier.runnerContainer
    );
    if (terminationDetails !== null) {
      this.stopIfApplicable(); // no need to wait - container already failed
      this.setInitFailed(terminationDetails.reason);
    }
  }

  private handleRunningPhase() {
    this.setRunning();
  }

  private handleTerminalPhase(phase: string, podStatus: k8s.V1PodStatus): void {
    this.stopIfApplicable();
    const { reason, exitCode } =
      inferK8sTerminatedPodTerminationDetailsNullable(
        podStatus,
        this.identifier.runnerContainer
      ) ?? { reason: 'Unknown', exitCode: null };

    if (phase === 'Failed') {
      this.setRunFailed(
        exitCode ?? PRESCOTT_K8S_POD_CONST.FAILURE_EXIT_CODE,
        reason
      );
    } else {
      this.setRunSucceeded(
        exitCode ?? PRESCOTT_K8S_POD_CONST.SUCCESS_EXIT_CODE
      );
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
    this.exitCode = PRESCOTT_K8S_POD_CONST.FAILURE_EXIT_CODE; // there is no exit code, because container was not started
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
