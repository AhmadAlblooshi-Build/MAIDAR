/**
 * Super Admin - Tenants Management Page
 * Manage all tenants, licenses, and subscriptions
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
import { Search, Plus, Building2, MoreVertical, Edit, UserPlus, CreditCard, Ban, Trash2 } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Mock data - replace with API call
  const tenants = [
    {
      id: '1',
      name: 'Acme Corporation',
      domain: 'acme.com',
      risk_score: 7.2,
      license_tier: 'Enterprise',
      seats_used: 1240,
      seats_total: 1500,
      admins: 3,
      provisioned_date: '2024-01-15',
      status: 'active',
    },
    {
      id: '2',
      name: 'TechStart Inc',
      domain: 'techstart.io',
      risk_score: 5.8,
      license_tier: 'Professional',
      seats_used: 450,
      seats_total: 500,
      admins: 2,
      provisioned_date: '2024-02-01',
      status: 'active',
    },
    {
      id: '3',
      name: 'Global Finance Ltd',
      domain: 'globalfinance.com',
      risk_score: 8.5,
      license_tier: 'Enterprise',
      seats_used: 2890,
      seats_total: 3000,
      admins: 5,
      provisioned_date: '2023-11-20',
      status: 'active',
    },
    {
      id: '4',
      name: 'Retail Solutions',
      domain: 'retailsolutions.net',
      risk_score: 6.4,
      license_tier: 'Business',
      seats_used: 180,
      seats_total: 250,
      admins: 1,
      provisioned_date: '2024-01-28',
      status: 'suspended',
    },
  ];

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

  const handleAction = (action: string, tenant: any) => {
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
        if (confirm(`Are you sure you want to ${tenant.status === 'active' ? 'suspend' : 'activate'} ${tenant.name}?`)) {
          console.log(`${tenant.status === 'active' ? 'Suspending' : 'Activating'} tenant:`, tenant.id);
        }
        break;
      case 'terminate':
        if (confirm(`WARNING: This will permanently delete ${tenant.name} and all associated data. This action cannot be undone. Are you sure?`)) {
          console.log('Terminating tenant:', tenant.id);
        }
        break;
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add New Tenant
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Tenants</div>
          <div className="text-2xl font-bold text-slate-900">{tenants.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {tenants.filter(t => t.status === 'active').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Seats</div>
          <div className="text-2xl font-bold text-teal-600">
            {tenants.reduce((sum, t) => sum + t.seats_total, 0).toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Avg Risk Score</div>
          <div className="text-2xl font-bold text-orange-600">
            {(tenants.reduce((sum, t) => sum + t.risk_score, 0) / tenants.length).toFixed(1)}
          </div>
        </Card>
      </div>

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

        <Table
          columns={[
            {
              key: 'name',
              label: 'Tenant',
              render: (value: string, row: any) => (
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
              key: 'risk_score',
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
                    {value.toFixed(1)}
                  </span>
                </div>
              ),
            },
            {
              key: 'license_tier',
              label: 'License & Seats',
              render: (value: string, row: any) => (
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
              key: 'admins',
              label: 'Admins',
              render: (value: number) => (
                <div className="text-sm font-semibold text-slate-900">{value} Admin{value !== 1 ? 's' : ''}</div>
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
                        <span>{row.status === 'active' ? 'Suspend' : 'Activate'} Tenant</span>
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
          data={filteredTenants}
          onRowClick={(row) => router.push(`/super-admin/tenants/${row.id}`)}
        />
      </Card>

      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          console.log('Tenant created successfully');
        }}
      />

      <EditTenantModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        tenant={selectedTenant}
        onSuccess={() => {
          setShowEditModal(false);
          console.log('Tenant updated successfully');
        }}
      />

      <ModifyLicenseModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        tenant={selectedTenant}
        onSuccess={() => {
          setShowLicenseModal(false);
          console.log('License updated successfully');
        }}
      />

      <AssignAdminModal
        isOpen={showAssignAdminModal}
        onClose={() => setShowAssignAdminModal(false)}
        tenant={selectedTenant}
        onSuccess={() => {
          setShowAssignAdminModal(false);
          console.log('Admin assigned successfully');
        }}
      />
    </div>
  );
}

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
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    license_tier: 'Professional',
    seats_total: 100,
    admin_email: '',
    admin_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to create tenant:', error);
      alert('Failed to create tenant');
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
        <Select
          label="License Tier"
          required
          value={formData.license_tier}
          onChange={(e) => setFormData({ ...formData, license_tier: e.target.value })}
          options={[
            { value: 'Starter', label: 'Starter (Up to 50 seats)' },
            { value: 'Business', label: 'Business (Up to 250 seats)' },
            { value: 'Professional', label: 'Professional (Up to 1,000 seats)' },
            { value: 'Enterprise', label: 'Enterprise (Unlimited seats)' },
          ]}
        />
        <Input
          label="Total Seats"
          type="number"
          required
          value={formData.seats_total}
          onChange={(e) => setFormData({ ...formData, seats_total: parseInt(e.target.value) })}
          placeholder="100"
        />
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
          <Button type="button" variant="secondary" onClick={onClose}>
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

function EditTenantModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    domain: tenant?.domain || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to update tenant:', error);
      alert('Failed to update tenant');
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

function ModifyLicenseModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    license_tier: tenant?.license_tier || 'Professional',
    seats_total: tenant?.seats_total || 100,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to update license:', error);
      alert('Failed to update license');
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return null;

  const tierFeatures = {
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
            {tierFeatures[formData.license_tier as keyof typeof tierFeatures]?.map((feature, idx) => (
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
          value={formData.seats_total}
          onChange={(e) => setFormData({ ...formData, seats_total: parseInt(e.target.value) })}
          placeholder="100"
        />
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> License changes will take effect immediately. Reducing seats below current usage will restrict new user creation.
          </p>
        </div>
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
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

function AssignAdminModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to assign admin:', error);
      alert('Failed to assign admin');
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
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            The new administrator will receive an email invitation with setup instructions.
          </p>
        </div>
        <Input
          label="Full Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          <Button type="button" variant="secondary" onClick={onClose}>
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
