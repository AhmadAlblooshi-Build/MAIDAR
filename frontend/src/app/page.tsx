/**
 * Root Page - Redirects to appropriate dashboard
 *
 * Simple router that redirects based on auth state
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin } = useAuthStore();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect once
    if (hasRedirected) return;

    setHasRedirected(true);

    // Small delay to ensure auth state is loaded
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (isSuperAdmin()) {
        router.replace('/super-admin/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasRedirected, isAuthenticated, isSuperAdmin, router]);

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
