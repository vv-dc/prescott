import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  LogProviderContract,
  LogSearchDto,
} from '@modules/contract/model/log-provider.contract';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { LogEntry } from '@modules/contract/model/log-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { ContractOpts } from '@modules/contract/model/contract';

const config = {
  workDir: '',
};

/* eslint-disable @typescript-eslint/no-unused-vars */
const init = async (opts: ContractOpts): Promise<void> => {
  config.workDir = opts.workDir;
};

const consumeLogGenerator = async (
  id: TaskRunHandle,
  generator: AsyncGenerator<LogEntry>
): Promise<void> => {
  // no-op
};

const writeLog = async (id: TaskRunHandle, entry: LogEntry): Promise<void> => {
  const logPath = path.join(
    config.workDir,
    'data',
    'log',
    `${id.handleId}.json`
  );
  await fs.appendFile(logPath, JSON.stringify(entry) + '\n', 'utf-8');
};

const writeLogBatch = async (
  id: TaskRunHandle,
  entries: LogEntry[]
): Promise<void> => {
  //
};

const searchLog = async (
  id: TaskRunHandle,
  paging: EntryPaging,
  dto: LogSearchDto
): Promise<EntryPage<string>> => {
  return {
    entries: [],
    next: 42,
  };
};

const logProvider: LogProviderContract = {
  init,
  consumeLogGenerator,
  writeLog,
  writeLogBatch,
  searchLog,
};

export default {
  buildContract: async () => logProvider,
};
