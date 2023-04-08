import { LogEntry } from '@modules/contract/model/log-entry';
import { TaskInstanceId } from '@modules/contract/model/task-instance-id';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-page';
import { Contract } from '@modules/contract/model/contract';

export interface LogProviderContract extends Contract {
  consumeLogGenerator(
    id: TaskInstanceId,
    generator: AsyncGenerator<LogEntry>
  ): Promise<void>;
  writeLog(id: TaskInstanceId, entry: LogEntry): Promise<void>;
  writeLogBatch(id: TaskInstanceId, entries: LogEntry): Promise<void>;
  searchLog(
    id: TaskInstanceId,
    paging: EntryPaging,
    dto: LogSearchDto
  ): Promise<EntryPage<string>>;
}

export interface LogSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}
