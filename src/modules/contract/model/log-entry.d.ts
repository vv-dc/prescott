export interface LogEntry {
  type: 'stdout' | 'stderr';
  date: Date;
  content: string;
}
