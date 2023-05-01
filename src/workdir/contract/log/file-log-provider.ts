import * as path from 'node:path';
import * as readline from 'node:readline';
import * as fs from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import {
  ensureDirectory,
  isErrnoException,
  waitStreamFinished,
} from '@lib/file.utils';
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
  const { taskId, runId } = runHandle;
  const logDir = path.join(config.workDir, 'data', 'log', taskId.toString());
  const logPath = path.join(logDir, `${runId}.json`);
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

type LogMatcherFn = (logEntry: LogEntry) => boolean;
const buildLogMatchersList = (dto: LogSearchDto): LogMatcherFn[] => {
  const { toDate, fromDate, searchTerm } = dto;
  const matchers: LogMatcherFn[] = [];
  if (fromDate) {
    matchers.push((entry) => entry.time >= fromDate.getTime());
  }
  if (toDate) {
    matchers.push((entry) => entry.time <= toDate.getTime());
  }
  if (searchTerm) {
    const regexp = new RegExp(searchTerm);
    matchers.push((entry) => regexp.test(entry.content));
  }
  return matchers;
};

const buildLogMatcher = (
  dto: LogSearchDto
): ((logEntry: LogEntry) => boolean) => {
  const checkers = buildLogMatchersList(dto);
  return (logEntry) => {
    for (const checker of checkers) {
      if (!checker(logEntry)) return false;
    }
    return true;
  };
};

const searchLog = async (
  runHandle: TaskRunHandle,
  dto: LogSearchDto,
  paging: EntryPaging
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

const flushLog = async (taskId: number): Promise<void> => {
  const [logDir] = buildLogFilePath({ taskId, runId: 0 });
  try {
    await fs.rm(logDir, { recursive: true });
  } catch (err) {
    if (!isErrnoException(err) || err.code !== 'ENOENT') {
      throw err;
    }
  }
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
