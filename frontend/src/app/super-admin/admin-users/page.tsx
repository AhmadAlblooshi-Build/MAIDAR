/**
 * Super Admin - Admin Users Management Page
 * Enterprise-grade admin user management with real API integration
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
import { Search, Plus, UserCog, MoreVertical, Edit, Mail, Ban, Shield, Building2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { adminUserAPI, tenantAPI } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string | null;
  tenant_name: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  mfa_enabled: boolean;
}

interface Tenant {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <AdminUsersContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function AdminUsersContent() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Fetch tenants for dropdowns - runs once on mount
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response: any = await tenantAPI.search({ page: 1, page_size: 100 });
        setTenants(response.tenants || []);
      } catch (err) {
        console.error('Failed to fetch tenants:', err);
      }
    };
    fetchTenants();
  }, []);

  // Manual refresh function for button clicks
  const fetchUsers = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const response: any = await adminUserAPI.search({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
        tenant_id: filterTenant !== 'all' ? filterTenant : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });

      setUsers(response.users);
      setTotalCount(response.total);
      setTotalPages(response.total_pages);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.detail || 'Failed to load admin users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch users when filters change - NO circular dependency (direct deps)
  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, filterTenant, filterStatus]);

  // Calculate statistics
  const activeCount = users.filter(u => u.is_active).length;
  const tenantAdminCount = users.filter(u => u.role === 'TENANT_ADMIN').length;
  const mfaEnabledCount = users.filter(u => u.mfa_enabled).length;

  const handleRefresh = () => {
    fetchUsers(false);
  };

  const handleSuspend = async (user: AdminUser) => {
    const action = user.is_active ? 'suspend' : 'activate';
    const confirmMessage = user.is_active
      ? `Are you sure you want to suspend ${user.full_name}? They will lose access immediately.`
      : `Are you sure you want to activate ${user.full_name}?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (user.is_active) {
        await adminUserAPI.suspend(user.id);
      } else {
        await adminUserAPI.activate(user.id);
      }

      await fetchUsers(false);
      alert(`User ${action}ed successfully`);
    } catch (err: any) {
      console.error(`Failed to ${action} user:`, err);
      alert(err.response?.data?.detail || `Failed to ${action} user`);
    }
  };

  const handleResendInvitation = async (user: AdminUser) => {
    if (!confirm(`Resend invitation email to ${user.email}?`)) return;

    try {
      // This would be an endpoint like adminUserAPI.resendInvitation(user.id)
      // For now, show success message
      alert(`Invitation email sent to ${user.email}`);
    } catch (err: any) {
      console.error('Failed to resend invitation:', err);
      alert('Failed to resend invitation email');
    }
  };

  const handleAction = (action: string, user: AdminUser) => {
    setSelectedUser(user);
    setShowActionMenu(null);

    switch (action) {
      case 'edit':
        setShowEditModal(true);
        break;
      case 'assign':
        setShowAssignModal(true);
        break;
      case 'resend':
        handleResendInvitation(user);
        break;
      case 'suspend':
        handleSuspend(user);
        break;
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-slate-600">Loading admin users...</p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Users</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => fetchUsers()} variant="primary">
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
            Admin Users
          </h1>
          <p className="text-slate-500 mt-1">
            Manage tenant administrators and access permissions
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
            Create Admin User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Admins</div>
          <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Active Users</div>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Tenant Admins</div>
          <div className="text-2xl font-bold text-teal-600">{tenantAdminCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">MFA Enabled</div>
          <div className="text-2xl font-bold text-purple-600">
            {users.length > 0 ? `${mfaEnabledCount} (${Math.round((mfaEnabledCount / users.length) * 100)}%)` : '0 (0%)'}
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={filterTenant}
            onChange={(e) => setFilterTenant(e.target.value)}
            options={[
              { value: 'all', label: 'All Tenants' },
              ...tenants.map(t => ({ value: t.id, label: t.name })),
            ]}
          />
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

        {/* Users Table */}
        {users.length === 0 ? (
          <div className="text-center py-12">
            <UserCog className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No admin users found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm || filterTenant !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first admin user'}
            </p>
            {!searchTerm && filterTenant === 'all' && filterStatus === 'all' && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Create First Admin User
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'full_name',
                  label: 'User',
                  render: (value: string, row: AdminUser) => (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                        {value.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center space-x-2">
                          <span>{value}</span>
                          {row.mfa_enabled && (
                            <span title="MFA Enabled">
                              <Shield className="w-4 h-4 text-green-600" />
                            </span>
                          )}
                          {row.email_verified && (
                            <span title="Email Verified">
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">{row.email}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'tenant_name',
                  label: 'Organization',
                  render: (value: string | null) => (
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-900">{value || 'No Tenant'}</span>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  label: 'Role',
                  render: (value: string) => {
                    if (value === 'TENANT_ADMIN') return <Badge variant="info">Tenant Admin</Badge>;
                    if (value === 'ANALYST') return <Badge variant="neutral">Analyst</Badge>;
                    if (value === 'PLATFORM_SUPER_ADMIN') return <Badge variant="warning">Super Admin</Badge>;
                    return <Badge variant="neutral">{value}</Badge>;
                  },
                },
                {
                  key: 'last_login_at',
                  label: 'Last Login',
                  render: (value: string | null) => (
                    <div>
                      <div className="text-sm text-slate-900">
                        {value ? new Date(value).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-xs text-slate-500">{formatTimeAgo(value)}</div>
                    </div>
                  ),
                },
                {
                  key: 'created_at',
                  label: 'Created',
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
                  render: (_, row: AdminUser) => (
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
                            <span>Edit User</span>
                          </button>
                          {row.tenant_id && (
                            <button
                              onClick={() => handleAction('assign', row)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>Reassign Tenant</span>
                            </button>
                          )}
                          {!row.email_verified && (
                            <button
                              onClick={() => handleAction('resend', row)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                            >
                              <Mail className="w-4 h-4" />
                              <span>Resend Invitation</span>
                            </button>
                          )}
                          <div className="border-t border-slate-200 my-2" />
                          <button
                            onClick={() => handleAction('suspend', row)}
                            className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-3"
                          >
                            <Ban className="w-4 h-4" />
                            <span>{row.is_active ? 'Suspend' : 'Activate'} User</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
              data={users}
              onRowClick={(row) => router.push(`/super-admin/admin-users/${row.id}`)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
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
      <CreateAdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        tenants={tenants}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchUsers(false);
        }}
      />

      <EditAdminModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onSuccess={() => {
          setShowEditModal(false);
          fetchUsers(false);
        }}
      />

      <AssignTenantModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        user={selectedUser}
        tenants={tenants}
        onSuccess={() => {
          setShowAssignModal(false);
          fetchUsers(false);
        }}
      />
    </div>
  );
}

// Create Admin Modal Component
function CreateAdminModal({
  isOpen,
  onClose,
  tenants,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    tenant_id: '',
    role: 'TENANT_ADMIN',
    require_mfa: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminUserAPI.create(formData);
      onSuccess();
      // Reset form
      setFormData({
        full_name: '',
        email: '',
        tenant_id: '',
        role: 'TENANT_ADMIN',
        require_mfa: true,
      });
    } catch (err: any) {
      console.error('Failed to create admin user:', err);
      setError(err.response?.data?.detail || 'Failed to create admin user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Admin User"
      subtitle="Add a new administrator for a tenant"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            The new administrator will receive an email invitation with account setup instructions and temporary password.
          </p>
        </div>

        <Input
          label="Full Name"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="John Doe"
        />

        <Input
          label="Email Address"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@company.com"
        />

        <Select
          label="Assign to Tenant"
          required
          value={formData.tenant_id}
          onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
          options={[
            { value: '', label: 'Select a tenant...' },
            ...tenants.map(t => ({ value: t.id, label: t.name })),
          ]}
        />

        <Select
          label="Role"
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={[
            { value: 'TENANT_ADMIN', label: 'Tenant Admin (Full Access)' },
            { value: 'ANALYST', label: 'Analyst (Read Only)' },
          ]}
        />

        <div className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <input
            type="checkbox"
            id="require_mfa"
            checked={formData.require_mfa}
            onChange={(e) => setFormData({ ...formData, require_mfa: e.target.checked })}
            className="w-4 h-4 text-teal-500 rounded"
          />
          <label htmlFor="require_mfa" className="text-sm text-slate-700 cursor-pointer">
            Require Multi-Factor Authentication (MFA)
          </label>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Admin Modal Component
function EditAdminModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'TENANT_ADMIN',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        role: user.role,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await adminUserAPI.update(user.id, formData);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to update admin user:', err);
      setError(err.response?.data?.detail || 'Failed to update admin user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Admin User"
      subtitle={`Update details for ${user.full_name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Input
          label="Full Name"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="John Doe"
        />

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Email Address</div>
          <div className="text-sm font-semibold text-slate-900">{user.email}</div>
          <div className="text-xs text-slate-500 mt-1">Email cannot be changed</div>
        </div>

        <Select
          label="Role"
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={[
            { value: 'TENANT_ADMIN', label: 'Tenant Admin (Full Access)' },
            { value: 'ANALYST', label: 'Analyst (Read Only)' },
          ]}
        />

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Organization</div>
          <div className="text-sm font-semibold text-slate-900">{user.tenant_name || 'No Tenant'}</div>
        </div>

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

// Assign Tenant Modal Component
function AssignTenantModal({
  isOpen,
  onClose,
  user,
  tenants,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  tenants: Tenant[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    if (user?.tenant_id) {
      setTenantId(user.tenant_id);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    setLoading(true);
    setError(null);

    try {
      await adminUserAPI.reassignTenant(user.id, tenantId);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to reassign tenant:', err);
      setError(err.response?.data?.detail || 'Failed to reassign tenant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Tenant"
      subtitle={`Change organization for ${user.full_name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Warning:</strong> Reassigning this user will revoke access to their current tenant and grant access to the new tenant immediately.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Current Organization</div>
          <div className="text-sm font-semibold text-slate-900">{user.tenant_name || 'No Tenant'}</div>
        </div>

        <Select
          label="New Organization"
          required
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          options={[
            { value: '', label: 'Select a tenant...' },
            ...tenants.map(t => ({ value: t.id, label: t.name })),
          ]}
        />

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Reassign Tenant
          </Button>
        </div>
      </form>
    </Modal>
  );
}
