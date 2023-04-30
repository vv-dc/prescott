export interface TaskRun {
  id: number;
  handleId?: string;
  taskId: number;
  status: 'running' | 'failed' | 'succeed';
  startedAt: Date;
  finishedAt?: Date;
}
