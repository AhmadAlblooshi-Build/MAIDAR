/**
 * Tenant Admin Dashboard (Company Risk Health)
 * MINIMAL VERSION - NO API CALLS FOR TESTING
 */

'use client';

import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';

export default function DashboardPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Dashboard</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600">
              Dashboard is loading... If you see this message without infinite errors,
              the layout is working correctly.
            </p>
            <p className="text-slate-600 mt-4">
              Check the browser console - there should be NO repeating errors.
            </p>
          </div>
        </div>
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}
