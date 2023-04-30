import { LogEntry } from '@modules/contract/model/log-entry';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface LogProviderContract extends Contract {
  consumeLogGenerator(
    runHandle: TaskRunHandle,
    generator: AsyncGenerator<LogEntry>
  ): Promise<void>;
  flushLog(runHandle: TaskRunHandle): Promise<void>;
  searchLog(
    runHandle: TaskRunHandle,
    paging: EntryPaging,
    dto: LogSearchDto
  ): Promise<EntryPage<LogEntry>>;
}

export interface LogSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}
