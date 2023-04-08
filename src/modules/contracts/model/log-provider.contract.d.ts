import { LogEntry } from '@modules/contracts/model/log-entry';
import { TaskInstanceId } from '@modules/contracts/model/task-instance-id';
import { EntryPage, EntryPaging } from '@modules/contracts/model/entry-page';
import { Contract } from '@modules/contracts/model/contract';

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
