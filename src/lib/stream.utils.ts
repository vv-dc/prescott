import {
  Transform,
  PassThrough,
  Readable,
  TransformCallback,
  ReadableOptions,
} from 'node:stream';

export class TransformObjectToNDJSONStream extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: unknown,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.push(JSON.stringify(chunk) + '\n');
    callback();
  }
}

export const streamToArray = async <T>(stream: Readable): Promise<T[]> => {
  const items: T[] = [];
  for await (const chunk of stream) {
    items.push(chunk);
  }
  return items;
};

export const mergeParallelStreams = (
  streams: Readable[],
  options?: ReadableOptions
): Readable => {
  const outStream = new PassThrough(options);

  for (const stream of streams) {
    stream.pipe(outStream, { end: false });

    stream.on('error', (err) => {
      outStream.emit('error', err);
    });

    stream.once('end', () => {
      const allStreamsEnded = streams.every((s) => s.readableEnded);
      if (allStreamsEnded) outStream.push(null);
    });
  }

  return outStream;
};
