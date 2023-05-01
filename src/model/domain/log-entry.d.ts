export interface LogEntry {
  stream: 'stderr' | 'stdout';
  time: number;
  content: string;
}
