'use client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { trpc } from '@/lib/trpc';

// Get access token from localStorage
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

import { useTokenRefresh } from '@/hooks/useTokenRefresh';

// Component to handle token refreshing
function TokenRefresher() {
  useTokenRefresh();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: unknown) => {
            const err = error as { data?: { httpStatus?: number } };
            if (err?.data?.httpStatus === 401) {
              if (typeof window !== 'undefined') {
                // Prevent loop if already on login page
                if (window.location.pathname.includes('/login')) return;

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('auth-storage');
                window.location.href = '/login';
              }
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error: unknown) => {
            const err = error as { data?: { httpStatus?: number } };
            if (err?.data?.httpStatus === 401) {
              if (typeof window !== 'undefined') {
                // Prevent loop if already on login page
                if (window.location.pathname.includes('/login')) return;

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('auth-storage');
                window.location.href = '/login';
              }
            }
          },
        }),
        defaultOptions: {
          queries: {
            retry: (failureCount, error: unknown) => {
              const err = error as { data?: { httpStatus?: number } };
              if (err?.data?.httpStatus === 401) return false;
              return failureCount < 3;
            },
            staleTime: 5 * 1000,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/trpc`
            : 'http://localhost:3001/trpc',
          // This function is called fresh for each request
          async headers() {
            const token = getAccessToken();
            // console.log('🔍 Client: Sending Request...', !!token);
            if (token) {
              return {
                Authorization: `Bearer ${token}`,
              };
            }
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TokenRefresher />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
