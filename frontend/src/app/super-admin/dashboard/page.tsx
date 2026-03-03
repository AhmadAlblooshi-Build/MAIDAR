/**
 * Super Admin Dashboard - Platform Control Center
 * Global overview across all tenants and users
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import {
  Globe,
  Shield,
  Clock,
  Users,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  MoreHorizontal
} from 'lucide-react';

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
  const [tenants, setTenants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const [tenantsRes, auditLogsRes, adminUsersRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/tenants/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: 1, page_size: 100 })
        }),
        fetch(`${apiUrl}/api/v1/audit-logs/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: 1, page_size: 10 })
        }),
        fetch(`${apiUrl}/api/v1/admin-users/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: 1, page_size: 100 })
        })
      ]);

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.tenants || []);
      }

      if (auditLogsRes.ok) {
        const data = await auditLogsRes.json();
        setAuditLogs(data.audit_logs || []);
      }

      if (adminUsersRes.ok) {
        const data = await adminUsersRes.json();
        setAdminUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // Calculate metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.is_active).length;
  const suspendedTenants = tenants.filter(t => !t.is_active).length;
  const totalAdmins = adminUsers.length;

  // Calculate department risk distribution (aggregate across all tenants)
  const departmentRiskMap = new Map<string, { count: number; totalRisk: number }>();

  // This would need employee data across tenants - for now show static structure
  const globalRiskDistribution = [
    { department: 'Sales', riskPercent: 64 },
    { department: 'Eng', riskPercent: 34 },
    { department: 'HR', riskPercent: 72 },
    { department: 'Finance', riskPercent: 88 },
    { department: 'Legal', riskPercent: 88 },
  ];

  // Format audit logs for Platform Intelligence
  const recentActivities = auditLogs.slice(0, 4).map((log) => {
    let icon = <Globe className="w-5 h-5" />;
    let iconBg = 'bg-blue-100';
    let category = 'System';

    if (log.action?.includes('login') || log.action?.includes('auth')) {
      icon = <Shield className="w-5 h-5" />;
      iconBg = 'bg-red-100';
      category = 'Security';
    } else if (log.action?.includes('create') || log.action?.includes('update')) {
      icon = <CheckCircle className="w-5 h-5" />;
      iconBg = 'bg-green-100';
      category = 'Update';
    } else if (log.action?.includes('delete') || log.action?.includes('suspend')) {
      icon = <AlertCircle className="w-5 h-5" />;
      iconBg = 'bg-orange-100';
      category = 'Alert';
    }

    return {
      title: log.action || 'System Activity',
      category,
      description: log.entity_type || 'Platform',
      timestamp: log.created_at,
      icon,
      iconBg
    };
  });

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 50) return 'bg-orange-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Platform Control Center</h1>
        <p className="text-slate-600 mt-1">Global overview across all tenants and users.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Tenants */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">{totalTenants}</div>
              <div className="text-slate-600 mb-3">Total Tenants</div>
              <div className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                <TrendingDown className="w-4 h-4" />
                <span>- 0.5% since last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Globe className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>

        {/* Active Tenants */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">{activeTenants}</div>
              <div className="text-slate-600 mb-3">Active</div>
              <div className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                <TrendingDown className="w-4 h-4" />
                <span>- 0.5% since last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>

        {/* Suspended Tenants */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">{suspendedTenants}</div>
              <div className="text-slate-600 mb-3">Suspended</div>
              <div className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>+ 0.5% since last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>

        {/* Tenant Admins */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">{totalAdmins}</div>
              <div className="text-slate-600 mb-3">Tenant Admins</div>
              <div className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                <TrendingDown className="w-4 h-4" />
                <span>- 0.5% since last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Risk Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Global Risk Distribution</h2>

          <div className="space-y-4">
            {globalRiskDistribution.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{item.department}</span>
                  <span className="text-sm font-bold text-slate-900">{item.riskPercent}%</span>
                </div>
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${item.riskPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Platform Intelligence */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Platform Intelligence</h2>

          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full ${activity.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-500">{activity.category} • {activity.description}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">No recent activity</p>
            )}
          </div>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tenant Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Risk Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Total Seats</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                // Calculate risk score (mock - would need real employee data)
                const riskScore = Math.floor(Math.random() * 100);

                return (
                  <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-slate-900">{tenant.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full rounded-full ${getRiskColor(riskScore)}`}
                            style={{ width: `${riskScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{riskScore}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-700">
                        {tenant.max_users || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={tenant.is_active ? 'success' : 'error'}>
                        {tenant.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {tenants.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>No tenants found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
