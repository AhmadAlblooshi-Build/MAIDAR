/**
 * Tenant Admin Route Guard
 *
 * Protects routes that should be accessed by Tenant Admins and Analysts
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/ui/Spinner';

interface TenantAdminGuardProps {
  children: React.ReactNode;
}

export default function TenantAdminGuard({ children }: TenantAdminGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isTenantAdmin, isAnalyst } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      // Not logged in, redirect to login
      router.push('/login');
    } else if (!isTenantAdmin() && !isAnalyst()) {
      // Logged in but not tenant admin/analyst, redirect to super admin portal
      router.push('/super-admin/dashboard');
    }
  }, [isAuthenticated, isTenantAdmin, isAnalyst, router]);

  // Show loading while checking authentication
  if (!isAuthenticated || (!isTenantAdmin() && !isAnalyst())) {
    return <Spinner fullScreen />;
  }

  return <>{children}</>;
}
