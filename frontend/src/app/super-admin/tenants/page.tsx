/**
 * Super Admin - Tenants Management Page
 * Enterprise-grade tenant management with real API integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import { Search, Plus, Building2, MoreVertical, Edit, UserPlus, CreditCard, Ban, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { tenantAPI } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  license_tier: string;
  seats_total: number;
  seats_used: number;
  provisioned_date: string;
  country_code: string;
  data_residency_region: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  admin_count: number;
  employee_count: number;
  avg_risk_score: number;
}

interface TenantStats {
  total: number;
  active: number;
  totalSeats: number;
  avgRiskScore: number;
}

export default function TenantsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <TenantsContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function TenantsContent() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Manual refresh function for button clicks
  const fetchTenants = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const response: any = await tenantAPI.search({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });

      setTenants(response.tenants);
      setTotalCount(response.total);
      setTotalPages(response.total_pages);
    } catch (err: any) {
      console.error('Failed to fetch tenants:', err);
      setError(err.response?.data?.detail || 'Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch tenants when filters change - NO circular dependency (direct deps)
  useEffect(() => {
    fetchTenants();
  }, [currentPage, searchTerm, filterStatus]);

  // Calculate statistics
  const stats: TenantStats = {
    total: totalCount,
    active: tenants.filter(t => t.is_active).length,
    totalSeats: tenants.reduce((sum, t) => sum + t.seats_total, 0),
    avgRiskScore: tenants.length > 0
      ? tenants.reduce((sum, t) => sum + t.avg_risk_score, 0) / tenants.length
      : 0,
  };

  const handleRefresh = () => {
    fetchTenants(false);
  };

  const handleSuspend = async (tenant: Tenant) => {
    const action = tenant.is_active ? 'suspend' : 'activate';
    const confirmMessage = tenant.is_active
      ? `Are you sure you want to suspend ${tenant.name}? This will prevent all users from accessing the system.`
      : `Are you sure you want to activate ${tenant.name}?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (tenant.is_active) {
        await tenantAPI.suspend(tenant.id);
      } else {
        await tenantAPI.activate(tenant.id);
      }

      // Refresh the list
      await fetchTenants(false);

      alert(`Tenant ${action}ed successfully`);
    } catch (err: any) {
      console.error(`Failed to ${action} tenant:`, err);
      alert(err.response?.data?.detail || `Failed to ${action} tenant`);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete ${tenant.name} and all associated data including:

• ${tenant.admin_count} administrator(s)
• ${tenant.employee_count} employee(s)
• All risk scores and simulations
• All audit logs

This action CANNOT be undone.

Type "${tenant.name}" to confirm deletion:`;

    const confirmation = prompt(confirmMessage);

    if (confirmation !== tenant.name) {
      if (confirmation !== null) {
        alert('Deletion cancelled. Tenant name did not match.');
      }
      return;
    }

    try {
      await tenantAPI.delete(tenant.id);
      await fetchTenants(false);
      alert('Tenant deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete tenant:', err);
      alert(err.response?.data?.detail || 'Failed to delete tenant');
    }
  };

  const handleAction = (action: string, tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowActionMenu(null);

    switch (action) {
      case 'edit':
        setShowEditModal(true);
        break;
      case 'license':
        setShowLicenseModal(true);
        break;
      case 'assign':
        setShowAssignAdminModal(true);
        break;
      case 'suspend':
        handleSuspend(tenant);
        break;
      case 'terminate':
        handleDelete(tenant);
        break;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskTextColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getLicenseBadgeColor = (tier: string) => {
    if (tier === 'Enterprise') return 'from-purple-500 to-pink-500';
    if (tier === 'Professional') return 'from-blue-500 to-cyan-500';
    if (tier === 'Business') return 'from-green-500 to-emerald-500';
    return 'from-slate-500 to-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-slate-600">Loading tenants...</p>
        </div>
      </div>
    );
  }

  if (error && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Tenants</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => fetchTenants()} variant="primary">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Tenant Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage organizations, licenses, and subscriptions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add New Tenant
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Tenants</div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Seats</div>
          <div className="text-2xl font-bold text-teal-600">{stats.totalSeats.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Avg Risk Score</div>
          <div className="text-2xl font-bold text-orange-600">
            {stats.avgRiskScore > 0 ? stats.avgRiskScore.toFixed(1) : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search tenants by name or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </div>

        {/* Tenants Table */}
        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tenants found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first tenant'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Create First Tenant
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'name',
                  label: 'Tenant',
                  render: (value: string, row: Tenant) => (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{value}</div>
                        <div className="text-sm text-slate-500">{row.domain}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'avg_risk_score',
                  label: 'Risk Score',
                  render: (value: number) => (
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className={`h-full ${getRiskColor(value)} rounded-full transition-all duration-500`}
                          style={{ width: `${(value / 10) * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${getRiskTextColor(value)} min-w-[35px]`}>
                        {value > 0 ? value.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'license_tier',
                  label: 'License & Seats',
                  render: (value: string, row: Tenant) => (
                    <div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-lg bg-gradient-to-r ${getLicenseBadgeColor(value)} text-white text-xs font-semibold mb-1`}>
                        {value}
                      </div>
                      <div className="text-sm text-slate-600">
                        {row.seats_used.toLocaleString()} / {row.seats_total.toLocaleString()} seats
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                          style={{ width: `${(row.seats_used / row.seats_total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'admin_count',
                  label: 'Admins',
                  render: (value: number) => (
                    <div className="text-sm font-semibold text-slate-900">
                      {value} Admin{value !== 1 ? 's' : ''}
                    </div>
                  ),
                },
                {
                  key: 'employee_count',
                  label: 'Employees',
                  render: (value: number) => (
                    <div className="text-sm font-semibold text-slate-900">
                      {value.toLocaleString()}
                    </div>
                  ),
                },
                {
                  key: 'provisioned_date',
                  label: 'Provisioned',
                  render: (value: string) => (
                    <div className="text-sm text-slate-600">
                      {new Date(value).toLocaleDateString()}
                    </div>
                  ),
                },
                {
                  key: 'is_active',
                  label: 'Status',
                  render: (value: boolean) => (
                    value
                      ? <Badge variant="success" dot>Active</Badge>
                      : <Badge variant="danger" dot>Suspended</Badge>
                  ),
                },
                {
                  key: 'action',
                  label: 'Actions',
                  render: (_, row: Tenant) => (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<MoreVertical className="w-4 h-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(showActionMenu === row.id ? null : row.id);
                        }}
                      />
                      {showActionMenu === row.id && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl backdrop-blur-xl bg-white/90 border border-white/20 shadow-2xl py-2 z-50">
                          <button
                            onClick={() => handleAction('edit', row)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit Tenant</span>
                          </button>
                          <button
                            onClick={() => handleAction('license', row)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Modify License</span>
                          </button>
                          <button
                            onClick={() => handleAction('assign', row)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Assign Admin</span>
                          </button>
                          <div className="border-t border-slate-200 my-2" />
                          <button
                            onClick={() => handleAction('suspend', row)}
                            className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-3"
                          >
                            <Ban className="w-4 h-4" />
                            <span>{row.is_active ? 'Suspend' : 'Activate'} Tenant</span>
                          </button>
                          <button
                            onClick={() => handleAction('terminate', row)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Terminate Tenant</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
              data={tenants}
              onRowClick={(row) => router.push(`/super-admin/tenants/${row.id}`)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tenants
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-teal-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modals */}
      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchTenants(false);
        }}
      />

      <EditTenantModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        tenant={selectedTenant}
        onSuccess={() => {
          setShowEditModal(false);
          fetchTenants(false);
        }}
      />

      <ModifyLicenseModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        tenant={selectedTenant}
        onSuccess={() => {
          setShowLicenseModal(false);
          fetchTenants(false);
        }}
      />

      <AssignAdminModal
        isOpen={showAssignAdminModal}
        onClose={() => setShowAssignAdminModal(false)}
        tenant={selectedTenant}
        onSuccess={() => {
          setShowAssignAdminModal(false);
          fetchTenants(false);
        }}
      />
    </div>
  );
}

// Create Tenant Modal Component
function CreateTenantModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    subdomain: '',
    license_tier: 'Professional',
    seats_total: 100,
    country_code: 'UAE',
    data_residency_region: 'UAE',
    admin_email: '',
    admin_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await tenantAPI.create(formData);
      onSuccess();
      // Reset form
      setFormData({
        name: '',
        domain: '',
        subdomain: '',
        license_tier: 'Professional',
        seats_total: 100,
        country_code: 'UAE',
        data_residency_region: 'UAE',
        admin_email: '',
        admin_name: '',
      });
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      setError(err.response?.data?.detail || 'Failed to create tenant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Tenant"
      subtitle="Add a new organization to the platform"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Input
          label="Organization Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Acme Corporation"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Domain"
            required
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="acme.com"
          />
          <Input
            label="Subdomain"
            required
            value={formData.subdomain}
            onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="acme"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="License Tier"
            required
            value={formData.license_tier}
            onChange={(e) => setFormData({ ...formData, license_tier: e.target.value })}
            options={[
              { value: 'Starter', label: 'Starter (Up to 50 seats)' },
              { value: 'Business', label: 'Business (Up to 250 seats)' },
              { value: 'Professional', label: 'Professional (Up to 1,000 seats)' },
              { value: 'Enterprise', label: 'Enterprise (Unlimited)' },
            ]}
          />
          <Input
            label="Total Seats"
            type="number"
            required
            min="1"
            value={formData.seats_total}
            onChange={(e) => setFormData({ ...formData, seats_total: parseInt(e.target.value) })}
            placeholder="100"
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Primary Administrator</h4>
          <div className="space-y-4">
            <Input
              label="Admin Name"
              required
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
              placeholder="John Doe"
            />
            <Input
              label="Admin Email"
              type="email"
              required
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
              placeholder="john@acme.com"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Tenant
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Tenant Modal Component
function EditTenantModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        domain: tenant.domain,
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      await tenantAPI.update(tenant.id, formData);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to update tenant:', err);
      setError(err.response?.data?.detail || 'Failed to update tenant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tenant"
      subtitle={`Update details for ${tenant.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Input
          label="Organization Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Acme Corporation"
        />
        <Input
          label="Domain"
          required
          value={formData.domain}
          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          placeholder="acme.com"
        />

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Modify License Modal Component
function ModifyLicenseModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    license_tier: 'Professional',
    seats_total: 100,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        license_tier: tenant.license_tier,
        seats_total: tenant.seats_total,
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      await tenantAPI.update(tenant.id, formData);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to update license:', err);
      setError(err.response?.data?.detail || 'Failed to update license. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return null;

  const tierFeatures: Record<string, string[]> = {
    Starter: ['Up to 50 seats', 'Basic analytics', 'Email support'],
    Business: ['Up to 250 seats', 'Advanced analytics', 'Priority support', 'Custom branding'],
    Professional: ['Up to 1,000 seats', 'Full analytics suite', 'Dedicated support', 'API access', 'SSO integration'],
    Enterprise: ['Unlimited seats', 'Enterprise analytics', '24/7 premium support', 'Custom features', 'SLA guarantee'],
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modify License"
      subtitle={`Update subscription for ${tenant.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Select
          label="License Tier"
          required
          value={formData.license_tier}
          onChange={(e) => setFormData({ ...formData, license_tier: e.target.value })}
          options={[
            { value: 'Starter', label: 'Starter' },
            { value: 'Business', label: 'Business' },
            { value: 'Professional', label: 'Professional' },
            { value: 'Enterprise', label: 'Enterprise' },
          ]}
        />

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Plan Features</h4>
          <ul className="space-y-1">
            {tierFeatures[formData.license_tier]?.map((feature, idx) => (
              <li key={idx} className="text-sm text-slate-600 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Input
          label="Total Seats"
          type="number"
          required
          min="1"
          value={formData.seats_total}
          onChange={(e) => setFormData({ ...formData, seats_total: parseInt(e.target.value) })}
          placeholder="100"
        />

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> License changes take effect immediately. Reducing seats below current usage ({tenant.seats_used}) will restrict new user creation.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Update License
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Assign Admin Modal Component (Note: This uses admin-users API which we'll implement next)
function AssignAdminModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      // This will use the admin-users API that we'll connect next
      const { adminUserAPI } = await import('@/lib/api');
      await adminUserAPI.create({
        email: formData.email,
        full_name: formData.full_name,
        tenant_id: tenant.id,
        role: 'TENANT_ADMIN',
        require_mfa: false,
      });

      onSuccess();
      // Reset form
      setFormData({ email: '', full_name: '' });
    } catch (err: any) {
      console.error('Failed to assign admin:', err);
      setError(err.response?.data?.detail || 'Failed to assign admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Administrator"
      subtitle={`Add a new admin for ${tenant.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            The new administrator will receive an email invitation with setup instructions and temporary password.
          </p>
        </div>

        <Input
          label="Full Name"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Jane Smith"
        />
        <Input
          label="Email Address"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="jane@acme.com"
        />

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
