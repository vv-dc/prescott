import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric-entry';
import {
  EntryPage,
  EntryPaging,
  EntrySearchDto,
} from '@modules/contract/model/entry-paging';
import { Contract } from '@modules/contract/model/contract';

export interface MetricProviderContract extends Contract {
  consumeMetricGenerator(
    runHandle: TaskRunHandle,
    generator: AsyncGenerator<MetricEntry>
  ): Promise<void>;
  searchMetric(
    runHandle: TaskRunHandle,
    dto: EntrySearchDto,
    paging: EntryPaging
  ): Promise<EntryPage<MetricEntry>>;
  aggregateMetric(
    runHandle: TaskRunHandle,
    dto: MetricAggregateDto
  ): Promise<MetricsAggregated>;
  flushMetric(taskId: number): Promise<void>;
}

export interface MetricAggregateDto {
  search: EntrySearchDto;
  apply: string;
}
