import { PaginatedResult } from '../dto/pagination.dto';

export function buildCursorPage<T extends { id: string }>(
  items: T[],
  limit: number,
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, pagination: { nextCursor, hasMore } };
}
