import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSE invalidation is the primary freshness mechanism.
        staleTime: 15_000,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.kind === 'network' && failureCount < 2,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Never auto-retry: a timed-out run may still be executing server-side.
        retry: false,
      },
    },
  });
}
