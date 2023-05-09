import { EntryPage, EntryPaging } from '@modules/contract/model/entry-paging';

export interface Paginator<T> {
  process: (entry: T) => boolean;
  build: () => EntryPage<T>;
}

export type PagingMatcherFn<T> = (entry: T) => boolean;

export const buildPaginator = <T>(
  isMatchFn: PagingMatcherFn<T>,
  paging: EntryPaging,
  maxPageSize: number
): Paginator<T> => {
  const fromIdx = paging.from ?? 0;
  const pageSize = Math.min(maxPageSize, paging.pageSize ?? maxPageSize);

  let matchedCounter = 0;
  const matchedEntries: T[] = [];

  const process = (entry: T): boolean => {
    if (!isMatchFn(entry)) return false;

    if (matchedCounter++ >= fromIdx) {
      matchedEntries.push(entry);
    }
    return matchedEntries.length === pageSize;
  };

  const build = (): EntryPage<T> => ({
    next: matchedEntries.length === pageSize ? matchedCounter + 1 : undefined,
    entries: matchedEntries,
  });

  return { process, build };
};
