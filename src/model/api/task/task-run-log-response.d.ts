export interface TaskRunLogResponse {
  entries: LogEntry[];
  next: number;
}
export interface LogEntry {
  stream: 'stderr' | 'stdout';
  time: number;
  content: string;
}
