import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../../shared/api/types';

/**
 * React Query owns all server state; Zustand owns only client state
 * (auth session, guest cart, UI overlays). Keeping that split strict is what
 * lets the whole data layer be reused by a Capacitor or React Native shell —
 * none of it touches the DOM.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state so React's StrictMode double-invoke does not build two
  // clients and split the cache in development.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // The window regaining focus is not a good enough reason to refetch
            // a product grid; it burns mobile data for almost no benefit.
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // 4xx responses are deterministic — retrying just delays the
              // error the user needs to see. Only retry transport failures.
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
