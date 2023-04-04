import { LogEntry } from '@modules/contracts/model/log-entry';
import { TaskInstanceId } from '@modules/contracts/model/task-instance-id';
import { EntryPage, EntryPaging } from '@modules/contracts/model/entry-page';

export interface LogProviderContract {
  consumeLogGenerator(
    id: TaskInstanceId,
    generator: AsyncGenerator<LogEntry>
  ): Promise<void>;
  writeLog(id: TaskInstanceId, entry: LogEntry): Promise<void>;
  writeLogBatch(id: TaskInstanceId, entries: LogEntry): Promise<void>;
  searchLog(
    id: TaskRunId,
    paging: EntryPaging,
    dto: SearchLogDto
  ): Promise<EntryPage<string>>;
}

export interface SearchLogDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}
