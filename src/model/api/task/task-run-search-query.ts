export interface TaskRunSearchQuery {
  search?: TaskRunSearchDto;
  paging?: TaskRunPagingDto;
}
export interface TaskRunSearchDto {
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
}
export interface TaskRunPagingDto {
  pageSize?: number;
  from?: number;
}
