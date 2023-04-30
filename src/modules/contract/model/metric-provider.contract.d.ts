import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { MetricEntry } from '@modules/contract/model/metric-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface MetricProviderContract extends Contract {
  consumeMetricGenerator(
    id: TaskRunHandle,
    generator: AsyncGenerator<MetricEntry>
  ): Promise<void>;
  writeMetric(id: TaskRunHandle, entry: MetricEntry): Promise<void>;
  writeMetricBatch(id: TaskRunHandle, entries: MetricEntry[]): Promise<void>;
  searchMetric(
    id: TaskRunHandle,
    paging: EntryPaging,
    dto: MetricSearchDto
  ): Promise<EntryPage<MetricEntry>>;
}

export interface MetricSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string; // assume it can be JSON.stringify(obj)
}
