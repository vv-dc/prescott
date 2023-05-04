import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import * as stream from 'node:stream';
import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const getDirectoryFilesSync = (directory: string): string[] => {
  const files = [] as string[];

  for (const file of readdirSync(directory)) {
    const filePath = join(directory, file);
    const filePaths = lstatSync(filePath).isDirectory()
      ? getDirectoryFilesSync(filePath)
      : [filePath];
    files.push(...filePaths);
  }

  return files;
};

export const ensureDirectory = async (directory: string): Promise<void> => {
  await fs.mkdir(directory, { recursive: true });
};

const streamFinished = util.promisify(stream.finished);
export const waitStreamFinished = async (
  streamToWait: stream.Readable | stream.Writable
): Promise<void> => {
  await streamFinished(streamToWait);
};

const isErrnoException = (err: unknown): err is NodeJS.ErrnoException => {
  return typeof err === 'object' && err !== null && 'code' in err;
};
export const rmRecursiveSafe = async (dir: string): Promise<void> => {
  try {
    await fs.rm(dir, { recursive: true });
  } catch (err) {
    if (!isErrnoException(err) || err.code !== 'ENOENT') {
      throw err;
    }
  }
};
