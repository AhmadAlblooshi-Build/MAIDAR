/**
 * Access Controls Page - RBAC Management
 * Manage roles, permissions, and user assignments
 */

'use client';

import { useState, useEffect } from 'react';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Users,
  Key,
  Lock,
  AlertCircle,
  CheckCircle,
  X,
  Save,
} from 'lucide-react';
import { rbacAPI, adminUserAPI } from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  is_super_admin_only: boolean;
}

interface Role {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  permission_count: number;
  user_count: number;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export default function AccessControlsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <AccessControlsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function AccessControlsContent() {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesData, permsData]: [any, any] = await Promise.all([
        rbacAPI.listRoles(),
        rbacAPI.listPermissions(),
      ]);

      setRoles(rolesData || []);
      setPermissions(permsData || []);
    } catch (err: any) {
      console.error('Failed to load RBAC data:', err);
      setError(err.detail || 'Failed to load access controls');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRole = async (roleId: string) => {
    try {
      const roleDetail: any = await rbacAPI.getRole(roleId);
      setSelectedRole(roleDetail || null);
    } catch (err: any) {
      setError(err.detail || 'Failed to load role details');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await rbacAPI.deleteRole(roleId);
      setSuccessMessage('Role deleted successfully');
      setShowDeleteModal(false);
      setSelectedRole(null);
      await loadData();
    } catch (err: any) {
      setError(err.detail || 'Failed to delete role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Access Controls
          </h1>
          <p className="text-slate-500 mt-1">
            Manage roles, permissions, and user access
          </p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50">
          <Shield className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">RBAC Enabled</span>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Roles ({roles.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'permissions'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>Permissions ({permissions.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Roles</h2>
            <Button
              onClick={() => setShowCreateModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Custom Role
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{role.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {role.description || 'No description'}
                    </p>
                  </div>
                  {role.is_system_role && (
                    <Badge variant="info" size="sm">
                      <Lock className="w-3 h-3 mr-1" />
                      System
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Permissions:</span>
                    <Badge variant="default">{role.permission_count}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Users:</span>
                    <Badge variant="default">{role.user_count}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Status:</span>
                    <Badge variant={role.is_active ? 'success' : 'error'}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4 pt-4 border-t border-slate-200">
                  <Button
                    onClick={() => handleViewRole(role.id)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  {!role.is_system_role && (
                    <>
                      <Button
                        onClick={() => {
                          setSelectedRole(role);
                          setShowEditModal(true);
                        }}
                        variant="secondary"
                        size="sm"
                        icon={<Edit2 className="w-3 h-3" />}
                      />
                      <Button
                        onClick={() => {
                          setSelectedRole(role);
                          setShowDeleteModal(true);
                        }}
                        variant="secondary"
                        size="sm"
                        icon={<Trash2 className="w-3 h-3" />}
                      />
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {roles.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No roles found</p>
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">System Permissions</h2>
            <Badge variant="info">Read-Only</Badge>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Restrictions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono text-teal-600">{perm.name}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default">{perm.resource}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">{perm.action}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {perm.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {perm.is_super_admin_only && (
                          <Badge variant="error" size="sm">
                            Super Admin Only
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {permissions.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No permissions found</p>
            </div>
          )}
        </div>
      )}

      {/* Role Details Modal */}
      {selectedRole && selectedRole.permissions && (
        <RoleDetailsModal
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
        />
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          permissions={permissions}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            setSuccessMessage('Role created successfully');
            loadData();
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRole && (
        <DeleteRoleModal
          role={selectedRole}
          onConfirm={() => handleDeleteRole(selectedRole.id)}
          onCancel={() => {
            setShowDeleteModal(false);
            setSelectedRole(null);
          }}
        />
      )}
    </div>
  );
}

// Role Details Modal Component
function RoleDetailsModal({ role, onClose }: { role: Role; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{role.name}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-600">Description</label>
            <p className="mt-1 text-slate-900">{role.description || 'No description'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Permissions ({role.permissions?.length || 0})</label>
            <div className="mt-2 space-y-2">
              {role.permissions?.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Key className="w-4 h-4 text-slate-400" />
                    <code className="text-sm font-mono text-teal-600">{perm.name}</code>
                  </div>
                  <span className="text-sm text-slate-600">{perm.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Role Modal Component
function CreateRoleModal({
  permissions,
  onClose,
  onSuccess,
  onError,
}: {
  permissions: Permission[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onError('Role name is required');
      return;
    }

    try {
      setSaving(true);
      await rbacAPI.createRole({
        name: name.trim(),
        description: description.trim() || null,
        permission_ids: selectedPermissions,
      });
      onSuccess();
    } catch (err: any) {
      onError(err.detail || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Create Custom Role</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., HR Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Describe this role's responsibilities..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Permissions ({selectedPermissions.length} selected)
            </label>
            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-4 space-y-4">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource}>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 capitalize">
                    {resource}
                  </h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 text-teal-500 rounded"
                          disabled={perm.is_super_admin_only}
                        />
                        <div className="flex-1">
                          <code className="text-sm font-mono text-teal-600">{perm.name}</code>
                          <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                        </div>
                        {perm.is_super_admin_only && (
                          <Badge variant="error" size="sm">
                            Super Admin
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              loading={saving}
              className="flex-1"
              icon={<Save className="w-4 h-4" />}
            >
              Create Role
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Role Modal Component
function DeleteRoleModal({
  role,
  onConfirm,
  onCancel,
}: {
  role: Role;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-slate-900 mb-2">
          Delete Role
        </h2>
        <p className="text-center text-slate-600 mb-6">
          Are you sure you want to delete <strong>{role.name}</strong>?
        </p>

        {role.user_count > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              This role is assigned to {role.user_count} user(s). Deletion will fail if any users still have this role.
            </p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Type <strong>{role.name}</strong> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder={role.name}
          />
        </div>

        <div className="flex space-x-3">
          <Button onClick={onCancel} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmText !== role.name}
            variant="primary"
            className="flex-1 bg-red-600 hover:bg-red-700"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
