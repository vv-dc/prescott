export interface LogEntry {
  type: 'stdout' | 'stderr';
  time: Date;
  content: string;
}
