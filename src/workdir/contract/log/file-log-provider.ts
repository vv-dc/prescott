import * as path from 'node:path';
import * as readline from 'node:readline';
import * as fs from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { ensureDirectory, waitStreamFinished } from '@lib/file.utils';
import {
  LogProviderContract,
  LogSearchDto,
} from '@modules/contract/model/log-provider.contract';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { ContractOpts } from '@modules/contract/model/contract';

const config = { workDir: '' };

const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const buildLogFilePath = (runHandle: TaskRunHandle): [string, string] => {
  const { taskId, handleId } = runHandle;
  const logDir = path.join(config.workDir, 'data', 'log', taskId.toString());
  const logPath = path.join(logDir, `${handleId.normalize()}.json`);
  return [logDir, logPath];
};

const consumeLogGenerator = async (
  runHandle: TaskRunHandle,
  logGenerator: AsyncGenerator<LogEntry>
): Promise<void> => {
  const [logDir, logPath] = buildLogFilePath(runHandle);
  await ensureDirectory(logDir);

  const writeStream = createWriteStream(logPath);
  for await (const logEntry of logGenerator) {
    writeStream.write(JSON.stringify(logEntry) + '\n');
  }
  writeStream.end();
  await waitStreamFinished(writeStream);
};

const buildLogMatcher =
  (dto: LogSearchDto): ((logEntry: LogEntry) => boolean) =>
  (logEntry) =>
    true;

const searchLog = async (
  runHandle: TaskRunHandle,
  paging: EntryPaging,
  dto: LogSearchDto
): Promise<EntryPage<LogEntry>> => {
  const fromIdx = paging.from ?? 0;
  const pageSize = Math.min(1000, paging.pageSize ?? 1000);
  const isMatch = buildLogMatcher(dto);
  let matchedCounter = 0;
  const matchedEntries: LogEntry[] = [];

  const [, logPath] = buildLogFilePath(runHandle);
  const linesReadable = readline.createInterface({
    input: createReadStream(logPath),
    crlfDelay: Infinity,
  });

  for await (const line of linesReadable) {
    const logEntry = JSON.parse(line);
    if (!isMatch(logEntry)) continue;

    if (matchedCounter++ >= fromIdx) matchedEntries.push(logEntry);
    if (matchedEntries.length === pageSize) break;
  }

  return { next: matchedCounter + 1, entries: matchedEntries };
};

const flushLog = async (runHandle: TaskRunHandle): Promise<void> => {
  const [logDir] = buildLogFilePath(runHandle);
  await fs.rm(logDir, { recursive: true });
};

const fileLogProvider: LogProviderContract = {
  init,
  consumeLogGenerator,
  searchLog,
  flushLog,
};

export default {
  buildContract: async () => fileLogProvider,
};
