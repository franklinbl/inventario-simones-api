export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPagination(
  query: Record<string, unknown>,
  defaults = { page: 1, limit: 10, maxLimit: 100 }
): PaginationParams {
  const readNum = (v: unknown, def: number) => {
    if (typeof v === 'string') {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : def;
    }
    return def;
  };

  const page = Math.max(readNum(query.page, defaults.page), 1);
  const rawLimit = readNum(query.limit, defaults.limit);
  const limit = Math.min(Math.max(rawLimit, 1), defaults.maxLimit);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function getPagingData<T>(
  data: { count: number; rows: T[] },
  page: number,
  limit: number
) {
  const { count: total, rows } = data;
  const totalPages = Math.ceil(total / limit);

  return {
    items: rows,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}