/**
 * Tenant Admin Route Guard - MINIMAL VERSION
 */

'use client';

export default function TenantAdminGuard({ children }: { children: React.ReactNode }) {
  // TEMPORARILY DISABLED - Just render children
  // TODO: Re-enable auth check after debugging re-render loop
  return <>{children}</>;
}
