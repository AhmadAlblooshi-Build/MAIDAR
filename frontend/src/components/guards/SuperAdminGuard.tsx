/**
 * Super Admin Route Guard
 *
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
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once to prevent infinite loops
    if (hasChecked.current) return;
    if (!_hasHydrated) return;

    hasChecked.current = true;

    // Check authentication and role
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Check if user is super admin
    if (user?.role !== 'PLATFORM_SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  // Always render children - redirect happens in background
  return <>{children}</>;
}
