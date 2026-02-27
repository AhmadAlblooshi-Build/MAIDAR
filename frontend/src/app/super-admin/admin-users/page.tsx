/**
 * Super Admin - Admin Users Management Page
 * Manage tenant administrators and their permissions
 */

'use client';

import { useState } from 'react';
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
import { Search, Plus, UserCog, MoreVertical, Edit, Mail, Ban, Shield, Building2 } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Mock data
  const adminUsers = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@acme.com',
      tenant_name: 'Acme Corporation',
      tenant_id: '1',
      role: 'TENANT_ADMIN',
      status: 'active',
      last_login: '2024-02-26T14:30:00',
      created_at: '2024-01-15T10:00:00',
      mfa_enabled: true,
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'mchen@techstart.io',
      tenant_name: 'TechStart Inc',
      tenant_id: '2',
      role: 'TENANT_ADMIN',
      status: 'active',
      last_login: '2024-02-27T09:15:00',
      created_at: '2024-02-01T08:30:00',
      mfa_enabled: true,
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily.r@globalfinance.com',
      tenant_name: 'Global Finance Ltd',
      tenant_id: '3',
      role: 'TENANT_ADMIN',
      status: 'active',
      last_login: '2024-02-27T11:45:00',
      created_at: '2023-11-20T12:00:00',
      mfa_enabled: true,
    },
    {
      id: '4',
      name: 'David Park',
      email: 'dpark@globalfinance.com',
      tenant_name: 'Global Finance Ltd',
      tenant_id: '3',
      role: 'ANALYST',
      status: 'active',
      last_login: '2024-02-26T16:20:00',
      created_at: '2024-01-10T14:30:00',
      mfa_enabled: false,
    },
    {
      id: '5',
      name: 'Lisa Thompson',
      email: 'lisa@retailsolutions.net',
      tenant_name: 'Retail Solutions',
      tenant_id: '4',
      role: 'TENANT_ADMIN',
      status: 'suspended',
      last_login: '2024-01-30T10:00:00',
      created_at: '2024-01-28T09:00:00',
      mfa_enabled: false,
    },
  ];

  const tenants = [
    { value: '1', label: 'Acme Corporation' },
    { value: '2', label: 'TechStart Inc' },
    { value: '3', label: 'Global Finance Ltd' },
    { value: '4', label: 'Retail Solutions' },
  ];

  const handleAction = (action: string, user: any) => {
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
        if (confirm(`Resend invitation email to ${user.email}?`)) {
          console.log('Resending invitation to:', user.email);
        }
        break;
      case 'suspend':
        if (confirm(`Are you sure you want to ${user.status === 'active' ? 'suspend' : 'reactivate'} ${user.name}?`)) {
          console.log(`${user.status === 'active' ? 'Suspending' : 'Reactivating'} user:`, user.id);
        }
        break;
    }
  };

  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTenant = filterTenant === 'all' || user.tenant_id === filterTenant;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesTenant && matchesStatus;
  });

  const activeCount = adminUsers.filter(u => u.status === 'active').length;
  const tenantAdminCount = adminUsers.filter(u => u.role === 'TENANT_ADMIN').length;
  const mfaEnabledCount = adminUsers.filter(u => u.mfa_enabled).length;

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
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Admin User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Admins</div>
          <div className="text-2xl font-bold text-slate-900">{adminUsers.length}</div>
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
            {mfaEnabledCount} ({Math.round((mfaEnabledCount / adminUsers.length) * 100)}%)
          </div>
        </Card>
      </div>

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
              ...tenants,
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

        <Table
          columns={[
            {
              key: 'name',
              label: 'User',
              render: (value: string, row: any) => (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                    {value.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{value}</span>
                      {row.mfa_enabled && (
                        <span title="MFA Enabled">
                          <Shield className="w-4 h-4 text-green-600" />
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
              render: (value: string) => (
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-900">{value}</span>
                </div>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (value: string) => (
                value === 'TENANT_ADMIN'
                  ? <Badge variant="info">Tenant Admin</Badge>
                  : <Badge variant="neutral">Analyst</Badge>
              ),
            },
            {
              key: 'last_login',
              label: 'Last Login',
              render: (value: string) => {
                const date = new Date(value);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);

                let timeAgo = '';
                if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                else timeAgo = `${diffDays}d ago`;

                return (
                  <div>
                    <div className="text-sm text-slate-900">{date.toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">{timeAgo}</div>
                  </div>
                );
              },
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
              key: 'status',
              label: 'Status',
              render: (value: string) => (
                value === 'active'
                  ? <Badge variant="success" dot>Active</Badge>
                  : <Badge variant="danger" dot>Suspended</Badge>
              ),
            },
            {
              key: 'action',
              label: 'Actions',
              render: (_, row: any) => (
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
                      <button
                        onClick={() => handleAction('assign', row)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Reassign Tenant</span>
                      </button>
                      <button
                        onClick={() => handleAction('resend', row)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Resend Invitation</span>
                      </button>
                      <div className="border-t border-slate-200 my-2" />
                      <button
                        onClick={() => handleAction('suspend', row)}
                        className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-3"
                      >
                        <Ban className="w-4 h-4" />
                        <span>{row.status === 'active' ? 'Suspend' : 'Reactivate'} User</span>
                      </button>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredUsers}
          onRowClick={(row) => router.push(`/super-admin/admin-users/${row.id}`)}
        />
      </Card>

      <CreateAdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        tenants={tenants}
        onSuccess={() => {
          setShowCreateModal(false);
          console.log('Admin user created successfully');
        }}
      />

      <EditAdminModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onSuccess={() => {
          setShowEditModal(false);
          console.log('Admin user updated successfully');
        }}
      />

      <AssignTenantModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        user={selectedUser}
        tenants={tenants}
        onSuccess={() => {
          setShowAssignModal(false);
          console.log('Tenant reassigned successfully');
        }}
      />
    </div>
  );
}

function CreateAdminModal({
  isOpen,
  onClose,
  tenants,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenants: Array<{ value: string; label: string }>;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tenant_id: '',
    role: 'TENANT_ADMIN',
    require_mfa: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to create admin user:', error);
      alert('Failed to create admin user');
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
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            The new administrator will receive an email invitation with account setup instructions.
          </p>
        </div>
        <Input
          label="Full Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            ...tenants,
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
          <Button type="button" variant="secondary" onClick={onClose}>
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

function EditAdminModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'TENANT_ADMIN',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to update admin user:', error);
      alert('Failed to update admin user');
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
      subtitle={`Update details for ${user.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          <div className="text-sm font-semibold text-slate-900">{user.tenant_name}</div>
        </div>
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
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

function AssignTenantModal({
  isOpen,
  onClose,
  user,
  tenants,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  tenants: Array<{ value: string; label: string }>;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState(user?.tenant_id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to reassign tenant:', error);
      alert('Failed to reassign tenant');
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
      subtitle={`Change organization for ${user.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Warning:</strong> Reassigning this user will revoke access to their current tenant and grant access to the new tenant.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Current Organization</div>
          <div className="text-sm font-semibold text-slate-900">{user.tenant_name}</div>
        </div>
        <Select
          label="New Organization"
          required
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          options={[
            { value: '', label: 'Select a tenant...' },
            ...tenants,
          ]}
        />
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
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
