/**
 * Tenant Admin Route Guard - WITH DEBUGGING
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function TenantAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const [shouldRender, setShouldRender] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');

  useEffect(() => {
    console.log('🔒 TenantAdminGuard effect running', {
      _hasHydrated,
      isAuthenticated,
      userRole: user?.role,
      shouldRender
    });

    if (!_hasHydrated) {
      setDebugInfo('Waiting for auth to hydrate...');
      return;
    }

    if (!isAuthenticated) {
      setDebugInfo('Not authenticated - redirecting to login...');
      console.log('❌ Not authenticated, redirecting to /login');
      router.replace('/login');
      return;
    }

    const role = user?.role;
    console.log('👤 User role:', role);

    if (role !== 'TENANT_ADMIN' && role !== 'ANALYST') {
      setDebugInfo(`Wrong role (${role}) - redirecting...`);
      console.log('❌ Wrong role, redirecting to /super-admin/dashboard');
      router.replace('/super-admin/dashboard');
      return;
    }

    // Auth passed!
    console.log('✅ Auth passed! Rendering children');
    setDebugInfo('Auth passed - rendering...');
    setShouldRender(true);
  }, [_hasHydrated, isAuthenticated, user?.role, router]);

  if (!_hasHydrated || !shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500 mb-4 mx-auto"></div>
          <p className="text-slate-600 text-sm">{debugInfo}</p>
          <p className="text-slate-400 text-xs mt-2">
            Hydrated: {_hasHydrated ? '✓' : '✗'} |
            Auth: {isAuthenticated ? '✓' : '✗'} |
            Role: {user?.role || 'null'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
