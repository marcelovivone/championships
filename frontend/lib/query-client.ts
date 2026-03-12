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
  // Note: keep default React Query logging; suppressing logger causes type errors
});
