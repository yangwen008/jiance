import type { ApiResponse, PaginatedData } from '../types';

export function success<T>(data?: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, message, data };
}

export function error(message: string, code = -1): ApiResponse {
  return { code, message };
}

export function paginated<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<PaginatedData<T>> {
  return success({
    list,
    total,
    page,
    pageSize,
  });
}
