/**
 * Super Admin Route Guard
 * Protects routes that should only be accessed by Super Admins
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check ONCE ever - no dependencies to retrigger
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Small delay to ensure store is hydrated
    const timer = setTimeout(() => {
      const store = useAuthStore.getState();

      if (!store.isAuthenticated) {
        router.replace('/login');
        return;
      }

      if (store.user?.role !== 'PLATFORM_SUPER_ADMIN') {
        router.replace('/dashboard');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []); // EMPTY DEPS - runs ONCE only

  return <>{children}</>;
}
