import { Readable } from 'node:stream';

import {
  LogEntry,
  LogEntryStream,
} from '@modules/contract/model/log/log-entry';

export async function* transformReadableToRFC3339LogGenerator(
  readable: Readable,
  stream: LogEntryStream
): AsyncGenerator<LogEntry> {
  for await (const chunk of readable) {
    const rawLogs = chunk.toString().split('\n');
    for (const rawLog of rawLogs) {
      if (rawLog === '') continue;
      yield parseRFC3339Log(rawLog, stream);
    }
  }
}

export const parseRFC3339Log = (
  rawLog: string,
  stream: LogEntryStream
): LogEntry => {
  const whiteSpaceIdx = rawLog.indexOf(' ');
  return {
    stream,
    time: Date.parse(rawLog.slice(0, whiteSpaceIdx)),
    content: rawLog.slice(whiteSpaceIdx + 1),
  };
};
