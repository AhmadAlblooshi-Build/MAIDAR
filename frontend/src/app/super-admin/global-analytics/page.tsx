/**
 * Super Admin - Global Analytics Page
 * Platform-wide analytics, industry benchmarks, and regional insights
 */

'use client';

import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

export default function GlobalAnalyticsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <GlobalAnalyticsContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function GlobalAnalyticsContent() {
  // Real data would be fetched from API - showing empty state for now
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Global Analytics
        </h1>
        <p className="text-slate-500 mt-1">
          Platform-wide insights and industry benchmarks
        </p>
      </div>
      <Card>
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Global analytics with industry benchmarks, regional insights, and trend analysis will be available once more data is collected across the platform.
          </p>
        </div>
      </Card>
    </div>
  );
}
