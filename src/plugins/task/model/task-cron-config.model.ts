export interface TaskCronConfig {
  name: string;
  cronString: string;
  callback: () => Promise<void>;
  once?: boolean;
}
