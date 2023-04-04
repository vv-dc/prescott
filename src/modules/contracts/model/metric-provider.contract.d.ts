import { TaskInstanceId } from '@modules/contracts/model/task-instance-id';
import { MetricEntry } from '@modules/contracts/model/metric-entry';
import { EntryPage, EntryPaging } from '@modules/contracts/model/entry-paging';

export interface MetricProviderContract {
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
