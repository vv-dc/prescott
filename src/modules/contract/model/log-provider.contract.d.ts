import { LogEntry } from '@modules/contract/model/log-entry';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import {
  EntryPage,
  EntryPaging,
  EntrySearchDto,
} from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface LogProviderContract extends Contract {
  consumeLogGenerator(
    runHandle: TaskRunHandle,
    generator: AsyncGenerator<LogEntry>
  ): Promise<void>;
  flushLog(taskId: number): Promise<void>;
  searchLog(
    runHandle: TaskRunHandle,
    dto: EntrySearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<LogEntry>>;
}
