/**
 * Super Admin - Tenants Management Page
 * Clean, UX-matched design for tenant management
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Search, MoreHorizontal, Play, Pause } from 'lucide-react';
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
  is_active: boolean;
  admin_count: number;
  avg_risk_score: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  // Form state for creating tenant
  const [formData, setFormData] = useState({
    organizationName: '',
    domain: '',
    contactEmail: '',
    licenseType: '',
    maxUsers: ''
  });
  const [creating, setCreating] = useState(false);

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

  const fetchTenants = async () => {
    try {
      setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [currentPage, searchTerm, filterStatus]);

  const handleSuspend = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to suspend ${tenant.name}?`)) return;

    try {
      await tenantAPI.suspend(tenant.id);
      await fetchTenants();
      setOpenDropdown(null);
    } catch (err: any) {
      console.error('Failed to suspend tenant:', err);
      alert('Failed to suspend tenant');
    }
  };

  const handleUnsuspend = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to unsuspend ${tenant.name}?`)) return;

    try {
      await tenantAPI.activate(tenant.id);
      await fetchTenants();
      setOpenDropdown(null);
    } catch (err: any) {
      console.error('Failed to unsuspend tenant:', err);
      alert('Failed to unsuspend tenant');
    }
  };

  const handleCreateTenant = async () => {
    // Validation
    if (!formData.organizationName || !formData.domain || !formData.contactEmail || !formData.licenseType || !formData.maxUsers) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setCreating(true);

      await tenantAPI.create({
        name: formData.organizationName,
        subdomain: formData.domain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        domain: `${formData.domain}.com`,
        license_tier: formData.licenseType,
        seats_total: parseInt(formData.maxUsers),
        admin_email: formData.contactEmail,
        admin_name: formData.organizationName + ' Admin'
      });

      // Reset form and close modal
      setFormData({
        organizationName: '',
        domain: '',
        contactEmail: '',
        licenseType: '',
        maxUsers: ''
      });
      setShowCreateModal(false);

      // Refresh tenant list
      await fetchTenants();

      alert('Tenant created successfully!');
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      alert(err.response?.data?.detail || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage platform tenants</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
        >
          Add New Tenant
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Tenants"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
        >
          <option value="all">All Roles</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tenant Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Risk Score</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">License & Seats</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Admins</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Provisioned</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {/* Tenant Name */}
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-slate-900">{tenant.name}</div>
                    <div className="text-sm text-slate-500">{tenant.subdomain}.com</div>
                  </div>
                </td>

                {/* Risk Score */}
                <td className="py-4 px-4">
                  {tenant.avg_risk_score > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            tenant.avg_risk_score >= 7 ? 'bg-red-500' :
                            tenant.avg_risk_score >= 4 ? 'bg-orange-500' :
                            'bg-teal-500'
                          }`}
                          style={{ width: `${(tenant.avg_risk_score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {(tenant.avg_risk_score * 10).toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>

                {/* License & Seats */}
                <td className="py-4 px-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{tenant.license_tier}</div>
                    <div className="text-sm text-slate-500">
                      {tenant.seats_used} / {tenant.seats_total} seats
                    </div>
                  </div>
                </td>

                {/* Admins */}
                <td className="py-4 px-4">
                  <div className="text-sm text-slate-700">
                    {tenant.admin_count} Admin{tenant.admin_count !== 1 ? 's' : ''}
                  </div>
                </td>

                {/* Provisioned */}
                <td className="py-4 px-4">
                  <div className="text-sm text-slate-700">
                    {formatDate(tenant.provisioned_date)}
                  </div>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  {tenant.is_active ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Suspended
                    </span>
                  )}
                </td>

                {/* Action */}
                <td className="py-4 px-4">
                  <div className="relative inline-block" ref={openDropdown === tenant.id ? dropdownRef : null}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === tenant.id ? null : tenant.id)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {openDropdown === tenant.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                        {tenant.is_active ? (
                          <button
                            onClick={() => handleSuspend(tenant)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnsuspend(tenant)}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            <span>Unsuspend</span>
                          </button>
                        )}
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
            {totalCount > 0 ? `${((currentPage - 1) * pageSize) + 1} of ${totalCount} Users shows` : '0 Users'}
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

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New Tenant</h2>
                <p className="text-sm text-slate-500 mt-1">Add a new organization to the platform</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Organization Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Company Name"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  placeholder="Enter Primary Domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Contact Email & License Type (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter Contact Email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    License Type
                  </label>
                  <input
                    type="text"
                    placeholder="Enter License Type"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Max Users */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Users
                </label>
                <input
                  type="number"
                  placeholder="Enter Max Users"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
