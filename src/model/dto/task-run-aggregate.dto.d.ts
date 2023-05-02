export interface TaskRunAggregateDto {
  search: TaskRunSearchDto;
  apply: string;
}
export interface TaskRunSearchDto {
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
}
