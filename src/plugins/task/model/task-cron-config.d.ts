export interface TaskCronConfig {
  taskId: number;
  cronString: string;
  callback: () => Promise<void>;
}
