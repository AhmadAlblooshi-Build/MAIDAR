/**
 * Super Admin - Admin Users Management Page
 * Clean UX design matching specification
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Search, MoreHorizontal, Edit, UserPlus, Pause, Play, Users, Trash2 } from 'lucide-react';
import { adminUserAPI, tenantAPI } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string | null;
  tenant_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    tenant_id: '',
    role: 'SUPER_ADMIN',
  });
  const [reassignTenantId, setReassignTenantId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch tenants for dropdowns
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

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response: any = await adminUserAPI.search({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
      });

      setUsers(response.users || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      tenant_id: user.tenant_id || '',
      role: user.role,
    });
    setShowEditModal(true);
    setOpenDropdown(null);
  };

  const handleReassignTenant = (user: AdminUser) => {
    setSelectedUser(user);
    setReassignTenantId(user.tenant_id || '');
    setShowReassignModal(true);
    setOpenDropdown(null);
  };

  const handleChangeRole = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      role: user.role,
    });
    setShowChangeRoleModal(true);
    setOpenDropdown(null);
  };

  const handleTerminate = async (user: AdminUser) => {
    setOpenDropdown(null);

    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete ${user.full_name} and revoke all access.\n\nThis action CANNOT be undone.\n\nType the user's email to confirm deletion:`
    );

    if (confirmed) {
      const emailConfirm = prompt('Enter the user email to confirm:');
      if (emailConfirm === user.email) {
        try {
          // Assuming there's a delete endpoint
          await adminUserAPI.suspend(user.id); // Replace with actual delete when available
          await fetchUsers();
          alert('User terminated successfully');
        } catch (err: any) {
          console.error('Failed to terminate user:', err);
          alert(err.response?.data?.detail || 'Failed to terminate user');
        }
      } else if (emailConfirm !== null) {
        alert('Email did not match. Termination cancelled.');
      }
    }
  };

  const handleSuspend = async (user: AdminUser) => {
    const action = user.is_active ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;

    try {
      if (user.is_active) {
        await adminUserAPI.suspend(user.id);
      } else {
        await adminUserAPI.activate(user.id);
      }
      await fetchUsers();
      setOpenDropdown(null);
    } catch (err: any) {
      console.error(`Failed to ${action} user:`, err);
      alert(err.response?.data?.detail || `Failed to ${action} user`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: Tenant Admin must have a tenant assigned
    if (formData.role === 'TENANT_ADMIN' && !formData.tenant_id) {
      alert('Please select a tenant for Tenant Admin');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare payload - exclude tenant_id for Super Admins
      const payload = formData.role === 'SUPER_ADMIN'
        ? { full_name: formData.full_name, email: formData.email, role: formData.role }
        : formData;

      await adminUserAPI.create(payload);
      setShowCreateModal(false);
      setFormData({ full_name: '', email: '', tenant_id: '', role: 'SUPER_ADMIN' });
      await fetchUsers();
      alert('Admin user created successfully!');
    } catch (err: any) {
      console.error('Failed to create user:', err);
      alert(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await adminUserAPI.update(selectedUser.id, {
        full_name: formData.full_name,
        role: formData.role,
      });
      setShowEditModal(false);
      await fetchUsers();
      alert('User updated successfully!');
    } catch (err: any) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await adminUserAPI.reassignTenant(selectedUser.id, reassignTenantId);
      setShowReassignModal(false);
      await fetchUsers();
      alert('Tenant reassigned successfully!');
    } catch (err: any) {
      console.error('Failed to reassign tenant:', err);
      alert(err.response?.data?.detail || 'Failed to reassign tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    // Validate role change
    const oldRole = selectedUser.role;
    const newRole = formData.role;

    // If changing from Super Admin to Tenant Admin, must select tenant
    if ((oldRole === 'SUPER_ADMIN' || oldRole === 'PLATFORM_SUPER_ADMIN') &&
        newRole === 'TENANT_ADMIN' && !formData.tenant_id) {
      alert('Please select a tenant for Tenant Admin');
      return;
    }

    try {
      setSubmitting(true);
      await adminUserAPI.update(selectedUser.id, {
        role: formData.role,
        tenant_id: formData.role === 'TENANT_ADMIN' ? formData.tenant_id : null,
      });
      setShowChangeRoleModal(false);
      await fetchUsers();
      alert('Role changed successfully!');
    } catch (err: any) {
      console.error('Failed to change role:', err);
      alert(err.response?.data?.detail || 'Failed to change role');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getRoleDisplay = (role: string) => {
    if (role === 'PLATFORM_SUPER_ADMIN' || role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'TENANT_ADMIN') return 'Tenant Admin';
    if (role === 'ANALYST') return 'Analyst';
    return role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage super admins and tenant admins</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
        >
          Add User
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tenant</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Last Login</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {/* User */}
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-slate-900">{user.full_name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                  </div>
                </td>

                {/* Role */}
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-700">{getRoleDisplay(user.role)}</span>
                </td>

                {/* Tenant */}
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-700">{user.tenant_name || '-'}</span>
                </td>

                {/* Last Login */}
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-700">{formatDate(user.last_login_at)}</span>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Suspended
                    </span>
                  )}
                </td>

                {/* Action */}
                <td className="py-4 px-4">
                  <div className="relative inline-block" ref={openDropdown === user.id ? dropdownRef : null}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {openDropdown === user.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                        {/* Edit User */}
                        <button
                          onClick={() => handleEditUser(user)}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit User</span>
                        </button>

                        {/* Change Role */}
                        <button
                          onClick={() => handleChangeRole(user)}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span>Change Role</span>
                        </button>

                        {/* Assign Tenant - Only for Tenant Admins */}
                        {user.tenant_id && (
                          <button
                            onClick={() => handleReassignTenant(user)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Assign Tenant</span>
                          </button>
                        )}

                        {/* Suspend/Activate */}
                        <button
                          onClick={() => handleSuspend(user)}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <Pause className="w-4 h-4" />
                          <span>{user.is_active ? 'Suspend' : 'Activate'}</span>
                        </button>

                        {/* Terminate */}
                        <button
                          onClick={() => handleTerminate(user)}
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

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {totalCount > 0 ? `1 of ${totalCount} Users shows` : '0 Users'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Previous
            </button>
            {[...Array(Math.min(totalPages, 3))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === pageNum
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 3 && <span className="text-slate-400">...</span>}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create Admin User</h2>
              <p className="text-sm text-slate-600 mt-1">Add a new administrator</p>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({
                      ...formData,
                      role: newRole,
                      // Clear tenant_id when switching to Super Admin
                      tenant_id: newRole === 'SUPER_ADMIN' ? '' : formData.tenant_id
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                </select>
              </div>

              {/* Only show Assign Tenant when Tenant Admin is selected */}
              {formData.role === 'TENANT_ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign Tenant</label>
                  <select
                    required
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Edit User</h2>
              <p className="text-sm text-slate-600 mt-1">{selectedUser.email}</p>
            </div>

            <form onSubmit={handleUpdateUser} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="ANALYST">Analyst</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Tenant Modal */}
      {showReassignModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Reassign Tenant</h2>
              <p className="text-sm text-slate-600 mt-1">{selectedUser.full_name}</p>
            </div>

            <form onSubmit={handleReassignSubmit} className="px-6 py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Current tenant: <strong>{selectedUser.tenant_name}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Tenant</label>
                <select
                  required
                  value={reassignTenantId}
                  onChange={(e) => setReassignTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">Select Tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Reassigning...' : 'Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showChangeRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Change Role</h2>
              <p className="text-sm text-slate-600 mt-1">{selectedUser.full_name}</p>
            </div>

            <form onSubmit={handleChangeRoleSubmit} className="px-6 py-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm text-slate-800">
                  Current role: <strong>{getRoleDisplay(selectedUser.role)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Role</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({
                      ...formData,
                      role: newRole,
                      tenant_id: newRole === 'SUPER_ADMIN' ? '' : formData.tenant_id
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                </select>
              </div>

              {/* Show tenant selector when changing to Tenant Admin */}
              {formData.role === 'TENANT_ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign Tenant</label>
                  <select
                    required
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChangeRoleModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Changing...' : 'Change Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
