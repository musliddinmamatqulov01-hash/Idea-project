import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Paginated<T> {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'pagination' in value &&
    Array.isArray((value as Paginated<unknown>).data)
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result && typeof result === 'object' && 'error' in result) {
          return result;
        }
        if (isPaginated(result)) {
          return result;
        }
        return { data: result ?? null };
      }),
    );
  }
}
