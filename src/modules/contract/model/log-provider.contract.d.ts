import { LogEntry } from '@modules/contract/model/log-entry';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface LogProviderContract extends Contract {
  consumeLogGenerator(
    id: TaskRunHandle,
    generator: AsyncGenerator<LogEntry>
  ): Promise<void>;
  writeLog(id: TaskRunHandle, entry: LogEntry): Promise<void>;
  writeLogBatch(id: TaskRunHandle, entries: LogEntry[]): Promise<void>;
  searchLog(
    id: TaskRunHandle,
    paging: EntryPaging,
    dto: LogSearchDto
  ): Promise<EntryPage<string>>;
}

export interface LogSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}
