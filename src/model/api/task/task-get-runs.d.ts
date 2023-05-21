export type TaskGetRuns = TaskRun[];

export interface TaskRun {
  id: number;
  handleId?: string;
  taskId: number;
  status: 'running' | 'failed' | 'succeed' | 'pending';
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
}
