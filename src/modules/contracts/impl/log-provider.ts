import {
  LogProviderContract,
  LogSearchDto,
} from '@modules/contracts/model/log-provider.contract';
import { TaskInstanceId } from '@modules/contracts/model/task-instance-id';
import { LogEntry } from '@modules/contracts/model/log-entry';
import { EntryPage, EntryPaging } from '@modules/contracts/model/entry-paging';
import { ContractOpts } from '@modules/contracts/model/contract';

/* eslint-disable @typescript-eslint/no-unused-vars */
const init = async (opts?: ContractOpts): Promise<void> => {
  //
};

const consumeLogGenerator = async (
  id: TaskInstanceId,
  generator: AsyncGenerator<LogEntry>
): Promise<void> => {
  // no-op
};

const writeLog = async (id: TaskInstanceId, entry: LogEntry): Promise<void> => {
  //
};

const writeLogBatch = async (
  id: TaskInstanceId,
  entries: LogEntry
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
  buildContract: () => logProvider,
};
