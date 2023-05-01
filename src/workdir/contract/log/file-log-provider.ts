import * as path from 'node:path';
import * as readline from 'node:readline';
import { createWriteStream, createReadStream } from 'node:fs';
import {
  ensureDirectory,
  rmRecursiveSafe,
  waitStreamFinished,
} from '@lib/file.utils';
import { buildPaginator, PagingMatcherFn } from '@lib/paging.utils';
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

const buildLogMatchersList = (
  dto: LogSearchDto
): PagingMatcherFn<LogEntry>[] => {
  const { toDate, fromDate, searchTerm } = dto;
  const matchers: PagingMatcherFn<LogEntry>[] = [];
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
  const isMatch = buildLogMatcher(dto);
  const paginator = buildPaginator(isMatch, paging, 1_000);

  const [, logPath] = buildLogFilePath(runHandle);
  const linesReadable = readline.createInterface({
    input: createReadStream(logPath),
    crlfDelay: Infinity,
  });

  for await (const line of linesReadable) {
    const logEntry: LogEntry = JSON.parse(line);
    const isDone = paginator.process(logEntry);
    if (isDone) break;
  }

  return paginator.build();
};

const flushLog = async (taskId: number): Promise<void> => {
  const [logDir] = buildLogFilePath({ taskId, runId: 0 });
  await rmRecursiveSafe(logDir);
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
