/**
 * Super Admin - Access Controls Page
 * Manage roles, permissions, and access policies
 */

'use client';

import { useState } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Shield, Lock, Users, Edit, Plus, Check, X } from 'lucide-react';

export default function AccessControlsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <AccessControlsContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  users_count: number;
  permissions: string[];
  is_system: boolean;
}

function AccessControlsContent() {
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // All available permissions grouped by category
  const allPermissions: Permission[] = [
    // Tenant Management
    { id: 'tenant.create', name: 'Create Tenants', description: 'Create new tenant organizations', category: 'Tenant Management' },
    { id: 'tenant.read', name: 'View Tenants', description: 'View tenant information', category: 'Tenant Management' },
    { id: 'tenant.update', name: 'Edit Tenants', description: 'Modify tenant settings', category: 'Tenant Management' },
    { id: 'tenant.delete', name: 'Delete Tenants', description: 'Remove tenant organizations', category: 'Tenant Management' },
    { id: 'tenant.suspend', name: 'Suspend Tenants', description: 'Suspend or reactivate tenants', category: 'Tenant Management' },

    // User Management
    { id: 'user.create', name: 'Create Users', description: 'Create new admin users', category: 'User Management' },
    { id: 'user.read', name: 'View Users', description: 'View user profiles', category: 'User Management' },
    { id: 'user.update', name: 'Edit Users', description: 'Modify user details', category: 'User Management' },
    { id: 'user.delete', name: 'Delete Users', description: 'Remove user accounts', category: 'User Management' },
    { id: 'user.assign', name: 'Assign Users', description: 'Assign users to tenants', category: 'User Management' },

    // Analytics
    { id: 'analytics.global', name: 'Global Analytics', description: 'View platform-wide analytics', category: 'Analytics' },
    { id: 'analytics.export', name: 'Export Analytics', description: 'Export analytics data', category: 'Analytics' },

    // System
    { id: 'system.audit', name: 'Audit Logs', description: 'Access audit trail', category: 'System' },
    { id: 'system.settings', name: 'System Settings', description: 'Modify platform settings', category: 'System' },
    { id: 'system.backup', name: 'Backup & Restore', description: 'Manage system backups', category: 'System' },
  ];

  const roles: Role[] = [
    {
      id: '1',
      name: 'Platform Super Admin',
      description: 'Full platform access with all permissions',
      color: 'from-purple-500 to-pink-500',
      icon: 'shield',
      users_count: 2,
      permissions: allPermissions.map(p => p.id),
      is_system: true,
    },
    {
      id: '2',
      name: 'Tenant Admin',
      description: 'Manage tenant organization and employees',
      color: 'from-blue-500 to-cyan-500',
      icon: 'users',
      users_count: 12,
      permissions: ['user.create', 'user.read', 'user.update', 'analytics.export'],
      is_system: true,
    },
    {
      id: '3',
      name: 'Analyst',
      description: 'Read-only access to analytics and reports',
      color: 'from-green-500 to-emerald-500',
      icon: 'lock',
      users_count: 8,
      permissions: ['user.read', 'analytics.global'],
      is_system: true,
    },
    {
      id: '4',
      name: 'Support Manager',
      description: 'Customer support with limited admin access',
      color: 'from-orange-500 to-amber-500',
      icon: 'users',
      users_count: 5,
      permissions: ['tenant.read', 'user.read', 'user.update', 'system.audit'],
      is_system: false,
    },
  ];

  const groupPermissionsByCategory = () => {
    const grouped: Record<string, Permission[]> = {};
    allPermissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Access Controls
          </h1>
          <p className="text-slate-500 mt-1">
            Manage roles and permissions across the platform
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddRoleModal(true)}
        >
          Add Custom Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Roles</div>
          <div className="text-2xl font-bold text-slate-900">{roles.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Active Users</div>
          <div className="text-2xl font-bold text-teal-600">
            {roles.reduce((sum, r) => sum + r.users_count, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Custom Roles</div>
          <div className="text-2xl font-bold text-purple-600">
            {roles.filter(r => !r.is_system).length}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            permissions={allPermissions}
            onEdit={() => {
              setSelectedRole(role);
              setShowEditRoleModal(true);
            }}
          />
        ))}
      </div>

      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Permission Matrix</h2>
        <p className="text-sm text-slate-600 mb-6">
          Overview of all permissions available across the platform
        </p>
        <div className="space-y-6">
          {Object.entries(groupPermissionsByCategory()).map(([category, perms]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-teal-500 to-cyan-500" />
                <span>{category}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all"
                  >
                    <div className="text-sm font-semibold text-slate-900">{perm.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{perm.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AddRoleModal
        isOpen={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        permissions={allPermissions}
        onSuccess={() => {
          setShowAddRoleModal(false);
          console.log('Role created successfully');
        }}
      />

      <EditRoleModal
        isOpen={showEditRoleModal}
        onClose={() => setShowEditRoleModal(false)}
        role={selectedRole}
        permissions={allPermissions}
        onSuccess={() => {
          setShowEditRoleModal(false);
          console.log('Role updated successfully');
        }}
      />
    </div>
  );
}

function RoleCard({
  role,
  permissions,
  onEdit,
}: {
  role: Role;
  permissions: Permission[];
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const rolePermissions = permissions.filter(p => role.permissions.includes(p.id));
  const permissionsByCategory = rolePermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = 0;
    acc[perm.category]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-5`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${role.color} shadow-lg`}>
              {role.icon === 'shield' && <Shield className="w-6 h-6 text-white" />}
              {role.icon === 'users' && <Users className="w-6 h-6 text-white" />}
              {role.icon === 'lock' && <Lock className="w-6 h-6 text-white" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">{role.name}</h3>
                {role.is_system && <Badge variant="neutral" size="sm">System</Badge>}
              </div>
              <p className="text-sm text-slate-600 mt-1">{role.description}</p>
            </div>
          </div>
          {!role.is_system && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Edit className="w-4 h-4" />}
              onClick={onEdit}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 mb-1">Users</div>
            <div className="text-lg font-bold text-slate-900">{role.users_count}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 mb-1">Permissions</div>
            <div className="text-lg font-bold text-slate-900">{role.permissions.length}</div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {Object.entries(permissionsByCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{category}</span>
              <Badge variant="info" size="sm">{count}</Badge>
            </div>
          ))}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          {expanded ? 'Hide' : 'Show'} all permissions
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 pt-4 border-t border-slate-200">
            {rolePermissions.map((perm) => (
              <div key={perm.id} className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{perm.name}</div>
                  <div className="text-xs text-slate-500">{perm.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function AddRoleModal({
  isOpen,
  onClose,
  permissions,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  permissions: Permission[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissions: [] as string[],
  });

  const togglePermission = (permId: string) => {
    setFormData({
      ...formData,
      selectedPermissions: formData.selectedPermissions.includes(permId)
        ? formData.selectedPermissions.filter(id => id !== permId)
        : [...formData.selectedPermissions, permId],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to create role:', error);
      alert('Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Role"
      subtitle="Define a new role with specific permissions"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Role Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Support Manager"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this role..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Permissions ({formData.selectedPermissions.length} selected)
          </label>
          <div className="max-h-96 overflow-y-auto space-y-4 p-4 rounded-lg border border-slate-200">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category}>
                <h4 className="text-sm font-bold text-slate-900 mb-2">{category}</h4>
                <div className="space-y-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-slate-50"
                    >
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={formData.selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 text-teal-500 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{perm.name}</div>
                        <div className="text-xs text-slate-500">{perm.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={formData.selectedPermissions.length === 0}
          >
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditRoleModal({
  isOpen,
  onClose,
  role,
  permissions,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    selectedPermissions: role?.permissions || [],
  });

  const togglePermission = (permId: string) => {
    setFormData({
      ...formData,
      selectedPermissions: formData.selectedPermissions.includes(permId)
        ? formData.selectedPermissions.filter(id => id !== permId)
        : [...formData.selectedPermissions, permId],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!role) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Role"
      subtitle={`Modify permissions for ${role.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Role Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Support Manager"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this role..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Permissions ({formData.selectedPermissions.length} selected)
          </label>
          <div className="max-h-96 overflow-y-auto space-y-4 p-4 rounded-lg border border-slate-200">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category}>
                <h4 className="text-sm font-bold text-slate-900 mb-2">{category}</h4>
                <div className="space-y-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-slate-50"
                    >
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={formData.selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 text-teal-500 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{perm.name}</div>
                        <div className="text-xs text-slate-500">{perm.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={formData.selectedPermissions.length === 0}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
