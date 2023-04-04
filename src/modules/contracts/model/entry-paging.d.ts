export interface EntryPage<T> {
  entries: T[];
  next?: number;
}

export interface EntryPaging {
  from?: number;
  pageSize: number;
}
