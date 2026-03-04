/**
 * Super Admin - Access Control Page
 * Role management, permissions, and login policies
 */

'use client';

import { useState, useEffect } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Search, Edit2 } from 'lucide-react';
import { rbacAPI } from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
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
  permissions?: Permission[];
}

export default function AccessControlsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <AccessControlsContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function AccessControlsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRolesWithPermissions();
  }, []);

  const fetchRolesWithPermissions = async () => {
    try {
      setLoading(true);

      // Fetch all roles
      const rolesData: any = await rbacAPI.listRoles();

      // Fetch detailed permissions for each role
      const rolesWithPermissions = await Promise.all(
        rolesData.map(async (role: Role) => {
          try {
            const roleDetail: any = await rbacAPI.getRole(role.id);
            return {
              ...role,
              permissions: roleDetail.permissions || [],
            };
          } catch (err) {
            console.error(`Failed to fetch permissions for role ${role.id}:`, err);
            return {
              ...role,
              permissions: [],
            };
          }
        })
      );

      setRoles(rolesWithPermissions);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter roles based on search
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h1 className="text-2xl font-bold text-slate-900">Access Control</h1>
          <p className="text-slate-500 text-sm mt-1">Role management, permissions, and login policies</p>
        </div>
        <button
          onClick={() => alert('Add Role functionality coming soon')}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
        >
          Add Role
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
        />
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {filteredRoles.length > 0 ? (
          filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{role.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {role.description || 'No description available'}
                  </p>
                </div>
                <button
                  onClick={() => alert('Edit role functionality coming soon')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              {/* Permissions Badges */}
              {role.permissions && role.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <span
                      key={permission.id}
                      className="px-3 py-1 bg-teal-50 text-teal-600 text-sm font-medium rounded-full"
                      title={permission.description}
                    >
                      {permission.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No permissions assigned</p>
              )}

              {/* Role metadata */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                <span>{role.permission_count} permission{role.permission_count !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                {role.is_system_role && (
                  <>
                    <span>•</span>
                    <span className="text-teal-600 font-medium">System Role</span>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">
            {searchTerm ? `No roles found matching "${searchTerm}"` : 'No roles available'}
          </div>
        )}
      </div>
    </div>
  );
}
