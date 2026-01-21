'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/useAuthStore';

// Decode JWT to get expiration time (without verifying)
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Payload = parts[1];
    if (!base64Payload) return null;
    const payload = JSON.parse(atob(base64Payload));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

// Check if token expires within the threshold (5 minutes)
function isTokenExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return false;
  return Date.now() + thresholdMs > expiry;
}

/**
 * Hook that implements sliding token expiration.
 * Automatically refreshes the access token when it's close to expiring,
 * keeping the user logged in as long as they're active.
 */
export function useTokenRefresh() {
  const updateTokens = useAuthStore((state) => state.updateTokens);
  const logout = useAuthStore((state) => state.logout);
  const isRefreshing = useRef(false);

  const refreshMutation = trpc.auth.refreshToken.useMutation({
    onSuccess: (data) => {
      updateTokens(data.accessToken);
      // Also store the new refresh token
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      isRefreshing.current = false;
    },
    onError: () => {
      // Refresh failed, log out
      isRefreshing.current = false;
      logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
  });

  useEffect(() => {
    // Check token every minute
    const checkInterval = setInterval(() => {
      if (typeof window === 'undefined') return;

      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // No tokens, nothing to refresh
      if (!accessToken || !refreshToken) return;

      // Already refreshing
      if (isRefreshing.current) return;

      // Check if access token is expiring soon (within 5 minutes)
      if (isTokenExpiringSoon(accessToken)) {
        console.log('🔄 Token expiring soon, refreshing...');
        isRefreshing.current = true;
        refreshMutation.mutate({ refreshToken });
      }
    }, 60 * 1000); // Check every minute

    // Also check immediately on mount
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    if (accessToken && refreshToken && isTokenExpiringSoon(accessToken)) {
      console.log('🔄 Token expiring soon (initial check), refreshing...');
      isRefreshing.current = true;
      refreshMutation.mutate({ refreshToken });
    }

    return () => clearInterval(checkInterval);
  }, [refreshMutation]);
}
