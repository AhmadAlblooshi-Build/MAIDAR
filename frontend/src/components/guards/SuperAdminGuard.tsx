/**
 * Super Admin Route Guard
 *
 * Protects routes that should only be accessed by Super Admins
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/ui/Spinner';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      // Not logged in, redirect to login
      router.push('/login');
    } else if (!isSuperAdmin()) {
      // Logged in but not super admin, redirect to their appropriate portal
      router.push('/dashboard');
    }
  }, [isAuthenticated, isSuperAdmin, router]);

  // Show loading while checking authentication
  if (!isAuthenticated || !isSuperAdmin()) {
    return <Spinner fullScreen />;
  }

  return <>{children}</>;
}
