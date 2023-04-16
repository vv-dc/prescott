import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  LogProviderContract,
  LogSearchDto,
} from '@modules/contract/model/log-provider.contract';
import { TaskInstanceId } from '@modules/contract/model/task-instance-id';
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
  id: TaskInstanceId,
  generator: AsyncGenerator<LogEntry>
): Promise<void> => {
  // no-op
};

const writeLog = async (id: TaskInstanceId, entry: LogEntry): Promise<void> => {
  const logPath = path.join(
    config.workDir,
    'data',
    'log',
    `${id.instanceId}.json`
  );
  await fs.appendFile(logPath, JSON.stringify(entry), 'utf-8');
};

const writeLogBatch = async (
  id: TaskInstanceId,
  entries: LogEntry[]
): Promise<void> => {
  //
};

const searchLog = async (
  id: TaskInstanceId,
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
