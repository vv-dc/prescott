export interface LogEntry {
  stream: LogEntryStream;
  time: Date;
  content: string;
}

export type LogEntryStream = 'stdout' | 'stderr';
