/**
 * Super Admin - Access Control Page
 * Role management, permissions, and login policies
 */

'use client';

import { useState } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Search, Edit2 } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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

  // System roles with their permissions
  const roles: Role[] = [
    {
      id: '1',
      name: 'Super Admin',
      description: 'Full platform governance and access',
      permissions: [
        'Manage Tenants',
        'Create Admins',
        'Suspend Tenants',
        'System Settings',
        'View Logs',
        'Access Control',
      ],
    },
    {
      id: '2',
      name: 'Tenant Admin',
      description: 'Tenant-level management and configuration',
      permissions: [
        'Manage Tenant Users',
        'Tenant Config',
        'View Logs',
      ],
    },
  ];

  // Filter roles based on search
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{role.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{role.description}</p>
              </div>
              <button
                onClick={() => alert('Edit role functionality coming soon')}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>

            {/* Permissions Badges */}
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permission, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-teal-50 text-teal-600 text-sm font-medium rounded-full"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        ))}

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No roles found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}
