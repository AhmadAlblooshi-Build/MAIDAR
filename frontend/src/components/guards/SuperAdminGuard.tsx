/**
 * Super Admin Route Guard
 *
 * Protects routes that should only be accessed by Super Admins
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/ui/Spinner';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand to hydrate before checking auth
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isSuperAdmin()) {
      router.push('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, isSuperAdmin, router]);

  // Always render children - let the pages handle their own loading states
  // The useEffect will redirect if needed
  return <>{children}</>;
}
