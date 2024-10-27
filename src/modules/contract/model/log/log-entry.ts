export interface LogEntry {
  stream: LogEntryStream;
  time: number;
  content: string;
}

export type LogEntryStream = 'stdout' | 'stderr';
