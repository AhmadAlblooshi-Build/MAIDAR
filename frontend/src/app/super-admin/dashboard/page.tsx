/**
 * Super Admin Dashboard - Platform Control Center
 * Global overview across all tenants and users
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { tenantAPI, adminUserAPI, auditLogAPI } from '@/lib/api';
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
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Edit,
  UserPlus,
  Pause,
  Trash2
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // License modal state
  const [editLicenseModal, setEditLicenseModal] = useState<any>(null);
  const [licenseTier, setLicenseTier] = useState('');
  const [seatsTotal, setSeatsTotal] = useState('');
  const [savingLicense, setSavingLicense] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [tenantsData, auditLogsData, adminUsersData] = await Promise.all([
        tenantAPI.search({ page: 1, page_size: 100 }),
        auditLogAPI.search({ page: 1, page_size: 10 }),
        adminUserAPI.search({ page: 1, page_size: 100 })
      ]);

      setTenants((tenantsData as any).tenants || []);
      setAuditLogs((auditLogsData as any).audit_logs || []);
      setAdminUsers((adminUsersData as any).users || []);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLicense = (tenant: any) => {
    setEditLicenseModal(tenant);
    setLicenseTier(tenant.license_tier || '');
    setSeatsTotal(tenant.seats_total?.toString() || '');
    setOpenDropdown(null);
  };

  const handleLicenseTierChange = (tier: string) => {
    setLicenseTier(tier);

    // Auto-set seats based on tier
    switch (tier) {
      case 'BASIC':
        setSeatsTotal('100');
        break;
      case 'PROFESSIONAL':
        setSeatsTotal('500');
        break;
      case 'ENTERPRISE':
        setSeatsTotal('1000');
        break;
      default:
        setSeatsTotal('');
    }
  };

  const handleSaveLicense = async () => {
    if (!editLicenseModal) return;

    try {
      setSavingLicense(true);
      await tenantAPI.update(editLicenseModal.id, {
        license_tier: licenseTier || null,
        seats_total: seatsTotal ? parseInt(seatsTotal) : null,
      });

      await loadDashboardData(); // Reload data
      setEditLicenseModal(null);
      setLicenseTier('');
      setSeatsTotal('');
    } catch (error) {
      console.error('Failed to update license:', error);
      alert('Failed to update license');
    } finally {
      setSavingLicense(false);
    }
  };

  const handleCloseLicenseModal = () => {
    setEditLicenseModal(null);
    setLicenseTier('');
    setSeatsTotal('');
  };

  const handleAssignAdmin = (tenant: any) => {
    // TODO: Open assign admin modal
    console.log('Assign admin for:', tenant.name);
    setOpenDropdown(null);
  };

  const handleSuspend = async (tenant: any) => {
    try {
      if (confirm(`Are you sure you want to suspend ${tenant.name}?`)) {
        await tenantAPI.suspend(tenant.id);
        await loadDashboardData(); // Reload data
        setOpenDropdown(null);
      }
    } catch (error) {
      console.error('Failed to suspend tenant:', error);
      alert('Failed to suspend tenant');
    }
  };

  const handleTerminate = async (tenant: any) => {
    try {
      const confirmed = confirm(
        `⚠️ WARNING: This will permanently delete ${tenant.name} and ALL associated data.\n\nThis action CANNOT be undone.\n\nType the tenant name to confirm deletion:`
      );
      if (confirmed) {
        await tenantAPI.delete(tenant.id);
        await loadDashboardData(); // Reload data
        setOpenDropdown(null);
      }
    } catch (error) {
      console.error('Failed to terminate tenant:', error);
      alert('Failed to terminate tenant');
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

  // Calculate activity distribution from audit logs
  const activityDistribution = auditLogs.reduce((acc: any, log: any) => {
    const action = log.action || 'Unknown';
    if (!acc[action]) {
      acc[action] = 0;
    }
    acc[action]++;
    return acc;
  }, {});

  const activityStats = Object.entries(activityDistribution)
    .map(([action, count]) => ({
      action,
      count: count as number,
      percentage: Math.round(((count as number) / auditLogs.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
              <div className="text-slate-600">Total Tenants</div>
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
              <div className="text-slate-600">Active</div>
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
              <div className="text-slate-600">Suspended</div>
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
              <div className="text-slate-600">Tenant Admins</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Activity Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Platform Activity Distribution</h2>

          <div className="space-y-4">
            {activityStats.length > 0 ? (
              activityStats.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{item.action}</span>
                    <span className="text-sm font-bold text-slate-900">{item.percentage}%</span>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">No activity data available</p>
            )}
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
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-sm font-medium text-slate-900">{tenant.name}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-500">N/A</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-700">
                      {tenant.seats_total || 'Not set'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={tenant.is_active ? 'success' : 'error'}>
                      {tenant.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="relative inline-block" ref={openDropdown === tenant.id ? dropdownRef : null}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === tenant.id ? null : tenant.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdown === tenant.id && (
                        <div className="absolute left-0 top-full mt-3 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                          {/* Edit License */}
                          <button
                            onClick={() => handleEditLicense(tenant)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit License</span>
                          </button>

                          {/* Assign Admin */}
                          <button
                            onClick={() => handleAssignAdmin(tenant)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Assign Admin</span>
                          </button>

                          {/* Divider */}
                          <div className="border-t border-slate-200 my-1" />

                          {/* Suspend */}
                          <button
                            onClick={() => handleSuspend(tenant)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                            <span>Suspend</span>
                          </button>

                          {/* Terminate */}
                          <button
                            onClick={() => handleTerminate(tenant)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Terminate</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tenants.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>No tenants found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Edit License Modal */}
      {editLicenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Edit License</h2>
              <p className="text-sm text-slate-600 mt-1">{editLicenseModal.name}</p>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* License Tier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  License Tier
                </label>
                <select
                  value={licenseTier}
                  onChange={(e) => handleLicenseTierChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Tier</option>
                  <option value="BASIC">Basic (100 seats)</option>
                  <option value="PROFESSIONAL">Professional (500 seats)</option>
                  <option value="ENTERPRISE">Enterprise (1000 seats)</option>
                </select>
              </div>

              {/* Seats Total */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Seats (License Capacity)
                </label>
                <input
                  type="number"
                  min="0"
                  value={seatsTotal}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Seats are automatically set based on the selected tier
                </p>
              </div>

              {/* Current Usage Info */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Current Usage:</span>
                  <span className="font-medium text-slate-900">
                    {editLicenseModal.seats_used || 0} seats
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={handleCloseLicenseModal}
                disabled={savingLicense}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLicense}
                disabled={savingLicense}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingLicense ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
