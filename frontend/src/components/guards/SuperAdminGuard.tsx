/**
 * Super Admin Route Guard
 * Simple, stable implementation - NO LOOPS!
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) return;

    // Check auth - redirect if needed, otherwise allow render
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Accept both PLATFORM_SUPER_ADMIN and SUPER_ADMIN for backwards compatibility
    const isSuperAdmin = user?.role === 'PLATFORM_SUPER_ADMIN' || user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      router.replace('/dashboard');
      return;
    }

    // Auth passed - allow render
    setShouldRender(true);
  }, [_hasHydrated]); // ONLY depend on hydration flag

  // Don't render until auth check passes
  if (!_hasHydrated || !shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}
