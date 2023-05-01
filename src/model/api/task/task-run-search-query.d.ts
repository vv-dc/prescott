export interface TaskRunSearchQuery {
  search?: {
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  };
  paging?: {
    pageSize?: number;
    from?: number;
  };
}
