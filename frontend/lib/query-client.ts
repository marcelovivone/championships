import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      // Suppress error logging for mutations - we handle errors in onError callbacks
      onError: () => {
        // Intentionally empty - prevents React Query from logging errors to console
      },
    },
  },
  // Suppress all React Query internal error logging
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress error logs
  },
});
