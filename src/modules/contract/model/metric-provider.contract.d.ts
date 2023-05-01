import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { MetricEntry } from '@modules/contract/model/metric-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface MetricProviderContract extends Contract {
  consumeMetricGenerator(
    runHandle: TaskRunHandle,
    generator: AsyncGenerator<MetricEntry>
  ): Promise<void>;
  searchMetric(
    runHandle: TaskRunHandle,
    dto: MetricSearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<MetricEntry>>;
  flushMetric(taskId: number): Promise<void>;
}

export interface MetricSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string; // assume it can be JSON.stringify(obj)
}
