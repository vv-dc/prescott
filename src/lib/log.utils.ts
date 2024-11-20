import { Transform, TransformCallback } from 'node:stream';

import {
  LogEntry,
  LogEntryStream,
} from '@modules/contract/model/log/log-entry';

export class TranformRFC3339LogStream extends Transform {
  constructor(private readonly stream: LogEntryStream) {
    super({ objectMode: true });
  }

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    const rawLogs = chunk.toString().split('\n');
    for (const rawLog of rawLogs) {
      if (rawLog === '') continue;
      this.push(parseRFC3339Log(rawLog, this.stream));
    }
    callback();
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
