export type TaskRunStatus =
  | 'running'
  | 'failed'
  | 'succeed'
  | 'pending'
  | 'stopped';
export type TaskGetRuns = TaskRun[];

export interface TaskRun {
  id: number;
  handleId?: string;
  taskId: number;
  status: TaskRunStatus;
  rank: number;
  startedAt?: Date;
  createdAt: Date;
  finishedAt?: Date;
}
