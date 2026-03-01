/**
 * Tenant Admin Route Guard
 * Protects routes that should be accessed by Tenant Admins and Analysts
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface TenantAdminGuardProps {
  children: React.ReactNode;
}

export default function TenantAdminGuard({ children }: TenantAdminGuardProps) {
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

      const role = store.user?.role;
      if (role !== 'TENANT_ADMIN' && role !== 'ANALYST') {
        router.replace('/super-admin/dashboard');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []); // EMPTY DEPS - runs ONCE only

  return <>{children}</>;
}
