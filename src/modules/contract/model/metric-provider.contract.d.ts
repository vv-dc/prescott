import { TaskInstanceId } from '@modules/contract/model/task-instance-id';
import { MetricEntry } from '@modules/contract/model/metric-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface MetricProviderContract extends Contract {
  consumeMetricGenerator(
    id: TaskInstanceId,
    generator: AsyncGenerator<MetricEntry>
  ): Promise<void>;
  writeMetric(id: TaskInstanceId, entry: MetricEntry): Promise<void>;
  writeMetricBatch(id: TaskInstanceId, entries: MetricEntry[]): Promise<void>;
  searchMetric(
    id: TaskInstanceId,
    paging: EntryPaging,
    dto: MetricSearchDto
  ): Promise<EntryPage<MetricEntry>>;
}

export interface MetricSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string; // assume it can be JSON.stringify(obj)
}
