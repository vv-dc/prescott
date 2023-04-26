import { TaskRunId } from '@modules/contract/model/task-run-id';
import { MetricEntry } from '@modules/contract/model/metric-entry';
import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface MetricProviderContract extends Contract {
  consumeMetricGenerator(
    id: TaskRunId,
    generator: AsyncGenerator<MetricEntry>
  ): Promise<void>;
  writeMetric(id: TaskRunId, entry: MetricEntry): Promise<void>;
  writeMetricBatch(id: TaskRunId, entries: MetricEntry[]): Promise<void>;
  searchMetric(
    id: TaskRunId,
    paging: EntryPaging,
    dto: MetricSearchDto
  ): Promise<EntryPage<MetricEntry>>;
}

export interface MetricSearchDto {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string; // assume it can be JSON.stringify(obj)
}
