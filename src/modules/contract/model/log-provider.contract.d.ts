import { LogEntry } from '@modules/contract/model/log-entry';
import { TaskRunId } from '@modules/contract/model/task-run-id';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface LogProviderContract extends Contract {
  consumeLogGenerator(
    id: TaskRunId,
    generator: AsyncGenerator<LogEntry>
  ): Promise<void>;
  writeLog(id: TaskRunId, entry: LogEntry): Promise<void>;
  writeLogBatch(id: TaskRunId, entries: LogEntry[]): Promise<void>;
  searchLog(
    id: TaskRunId,
    paging: EntryPaging,
    dto: LogSearchDto
  ): Promise<EntryPage<string>>;
}

export interface LogSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}
