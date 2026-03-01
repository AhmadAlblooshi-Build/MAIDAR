/**
 * Root Page - Redirects to appropriate dashboard
 *
 * Simple router that redirects based on auth state
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin } = useAuthStore();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once using ref (doesn't trigger re-render)
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    // Redirect based on auth state
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (isSuperAdmin()) {
      router.replace('/super-admin/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, []); // Empty deps - run once on mount

  // Show simple loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500 mb-4"></div>
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}
