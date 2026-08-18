import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../../shared/api/types';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Held in state so StrictMode's double-invoke does not create two clients
  // and split the cache in development.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // Unlike the storefront, refetching on focus is *desirable* here:
            // an admin coming back to the tab wants the live fulfilment queue,
            // not whatever it looked like twenty minutes ago.
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              // 4xx is deterministic — retrying only delays the error the
              // admin needs to see and act on.
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
