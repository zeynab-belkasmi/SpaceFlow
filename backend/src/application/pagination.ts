export interface PageRequest {
  /** 1-based page number. Default: 1. */
  page?: number;
  /** Default: 20. */
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Cuts one page out of a full list.
 * Fine in memory; with a database, the repository would do LIMIT/OFFSET instead.
 * `page` and `pageSize` are expected to be validated positive integers.
 */
export function paginate<T>(
  all: T[],
  { page = 1, pageSize = DEFAULT_PAGE_SIZE }: PageRequest,
): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    page,
    pageSize,
    total: all.length,
    totalPages: Math.ceil(all.length / pageSize),
  };
}
