/**
 * Tenant Admin Route Guard
 *
 * Protects routes that should be accessed by Tenant Admins and Analysts
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/ui/Spinner';

interface TenantAdminGuardProps {
  children: React.ReactNode;
}

export default function TenantAdminGuard({ children }: TenantAdminGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isTenantAdmin, isAnalyst, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand to hydrate before checking auth
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isTenantAdmin() && !isAnalyst()) {
      router.push('/super-admin/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, isTenantAdmin, isAnalyst, router]);

  // Always render children - let the pages handle their own loading states
  // The useEffect will redirect if needed
  return <>{children}</>;
}
