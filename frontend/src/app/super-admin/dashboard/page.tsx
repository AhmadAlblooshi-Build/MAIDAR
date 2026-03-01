/**
 * Super Admin Dashboard (Platform Control Center)
 *
 * Platform-wide oversight and tenant management
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card, { StatCard } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import { Globe, Shield, AlertTriangle, Users, TrendingDown, TrendingUp, Clock } from 'lucide-react';

export default function SuperAdminDashboardPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <DashboardContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Fetch real data from APIs
      const [tenantsRes, auditLogsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/tenants/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page: 1, page_size: 10 })
        }),
        fetch(`${apiUrl}/api/v1/audit-logs/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page: 1, page_size: 5 })
        })
      ]);

      const tenantsData = await tenantsRes.json();
      const auditLogsData = await auditLogsRes.json();

      const tenants = tenantsData.items || [];
      const totalTenants = tenantsData.total || 0;
      const activeTenants = tenants.filter((t: any) => t.is_active).length;
      const suspendedTenants = tenants.filter((t: any) => !t.is_active).length;

      const data = {
        kpis: {
          totalTenants,
          activeTenants,
          suspendedTenants,
          tenantAdmins: 0, // Would need separate API call
          change: 0,
        },
        tenants: tenants.slice(0, 4).map((t: any) => ({
          id: t.id,
          name: t.name,
          risk_score: 0, // Would need risk calculation
          seats: 0, // Would need employee count
          status: t.is_active ? 'Active' : 'Suspended'
        })),
        platformIntelligence: (auditLogsData.items || []).map((log: any) => ({
          event: log.action,
          actor: `${log.actor_name || 'System'} • ${log.tenant_name || 'Global'}`,
          time: new Date(log.timestamp).toLocaleString(),
          type: 'info'
        }))
      };

      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (!dashboardData) return null;

  const { kpis, tenants, platformIntelligence } = dashboardData;

  const getRiskColor = (score: number) => {
    if (score < 30) return 'bg-green-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Platform Control Center
        </h1>
        <p className="text-slate-500 mt-1">Global overview across all tenants and users</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tenants"
          value={kpis.totalTenants.toString()}
          change={kpis.change}
          trend="down"
          icon={<Globe className="w-6 h-6" />}
          gradient="from-teal-500 to-cyan-500"
        />
        <StatCard
          title="Active"
          value={kpis.activeTenants.toString()}
          change={kpis.change}
          trend="down"
          icon={<Shield className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Suspended"
          value={kpis.suspendedTenants.toString()}
          change={kpis.change}
          trend="down"
          icon={<AlertTriangle className="w-6 h-6" />}
          gradient="from-orange-500 to-amber-500"
        />
        <StatCard
          title="Tenant Admins"
          value={kpis.tenantAdmins.toString()}
          change={kpis.change}
          trend="down"
          icon={<Users className="w-6 h-6" />}
          gradient="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Platform Intelligence */}
      <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-6">Platform Intelligence</h2>
          <div className="space-y-3">
            {platformIntelligence.map((item: any, idx: number) => {
              const iconBgMap: Record<string, string> = {
                info: 'bg-blue-100',
                critical: 'bg-red-100',
                success: 'bg-green-100',
                warning: 'bg-yellow-100',
              };
              const iconBg = iconBgMap[item.type as string] || 'bg-blue-100';

              const iconColorMap: Record<string, string> = {
                info: 'text-blue-600',
                critical: 'text-red-600',
                success: 'text-green-600',
                warning: 'text-yellow-600',
              };
              const iconColor = iconColorMap[item.type as string] || 'text-blue-600';

              return (
                <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`p-2 rounded-lg ${iconBg}`}>
                    {item.type === 'critical' && <AlertTriangle className={`w-4 h-4 ${iconColor}`} />}
                    {item.type === 'success' && <TrendingUp className={`w-4 h-4 ${iconColor}`} />}
                    {item.type === 'warning' && <Clock className={`w-4 h-4 ${iconColor}`} />}
                    {item.type === 'info' && <Globe className={`w-4 h-4 ${iconColor}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900">{item.event}</div>
                    <div className="text-xs text-slate-500 truncate">{item.actor}</div>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">{item.time}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Tenant Directory Table */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Tenant Directory</h2>
          <button
            onClick={() => router.push('/super-admin/tenants')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:shadow-lg transition-all"
          >
            View All Tenants
          </button>
        </div>

        <Table
          columns={[
            { key: 'name', label: 'Tenant Name' },
            {
              key: 'risk_score',
              label: 'Risk Score',
              render: (value: number) => (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                    <div
                      className={`h-full ${getRiskColor(value)} rounded-full`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 min-w-[30px]">{value}</span>
                </div>
              ),
            },
            {
              key: 'seats',
              label: 'Total Seats',
              render: (value: number) => value.toLocaleString(),
            },
            {
              key: 'status',
              label: 'Status',
              render: (value: string) => (
                <Badge variant={value === 'Active' ? 'success' : 'danger'} dot>
                  {value}
                </Badge>
              ),
            },
            {
              key: 'action',
              label: 'Action',
              render: () => (
                <button className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              ),
            },
          ]}
          data={tenants}
          onRowClick={(row) => router.push(`/super-admin/tenants/${row.id}`)}
        />
      </Card>
    </div>
  );
}
