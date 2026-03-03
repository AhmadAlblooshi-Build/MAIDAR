/**
 * Super Admin - Tenants Management Page
 * Clean, UX-matched design for tenant management
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Search, MoreHorizontal, Play, Pause, Edit, UserPlus, Trash2, ChevronDown } from 'lucide-react';
import { tenantAPI, employeeAPI } from '@/lib/api';

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

  // License tiers with default user limits
  const licenseTiers = [
    { name: 'Basic', maxUsers: 100 },
    { name: 'Professional', maxUsers: 500 },
    { name: 'Enterprise', maxUsers: 1000 }
  ];

  // Form state for creating tenant
  const [formData, setFormData] = useState({
    organizationName: '',
    domain: '',
    contactEmail: '',
    licenseType: '',
    maxUsers: ''
  });
  const [creating, setCreating] = useState(false);

  // Edit License modal state
  const [editLicenseModal, setEditLicenseModal] = useState<Tenant | null>(null);
  const [licenseTier, setLicenseTier] = useState('');
  const [seatsTotal, setSeatsTotal] = useState('');
  const [savingLicense, setSavingLicense] = useState(false);

  // Assign Admin modal state
  const [assignAdminModal, setAssignAdminModal] = useState<Tenant | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Handle license type change and auto-fill max users
  const handleLicenseTypeChange = (tierName: string) => {
    const selectedTier = licenseTiers.find(tier => tier.name === tierName);
    setFormData({
      ...formData,
      licenseType: tierName,
      maxUsers: selectedTier ? selectedTier.maxUsers.toString() : ''
    });
  };

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

  const handleEditLicense = (tenant: Tenant) => {
    setEditLicenseModal(tenant);
    setLicenseTier(tenant.license_tier || '');
    setSeatsTotal(tenant.seats_total?.toString() || '');
    setOpenDropdown(null);
  };

  const handleAssignAdmin = async (tenant: Tenant) => {
    setOpenDropdown(null);
    setAssignAdminModal(tenant);
    setSelectedEmployee(null);
    setEmployeeSearchTerm('');

    // Fetch all employees for this tenant
    try {
      setLoadingEmployees(true);

      // Use super admin endpoint to get employees for specific tenant
      const response: any = await tenantAPI.getEmployees(tenant.id);

      setEmployees(response.employees || []);
    } catch (err: any) {
      console.error('Failed to fetch employees:', err);
      alert('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleEditLicenseTierChange = (tier: string) => {
    setLicenseTier(tier);
    const selectedTier = licenseTiers.find(t => t.name === tier);
    if (selectedTier) {
      setSeatsTotal(selectedTier.maxUsers.toString());
    }
  };

  const handleSaveLicense = async () => {
    if (!editLicenseModal) return;

    try {
      setSavingLicense(true);

      await tenantAPI.update(editLicenseModal.id, {
        license_tier: licenseTier || null,
        seats_total: seatsTotal ? parseInt(seatsTotal) : null,
      });

      // Refresh tenant list
      await fetchTenants();

      // Close modal
      setEditLicenseModal(null);
      setLicenseTier('');
      setSeatsTotal('');

      alert('License updated successfully');
    } catch (err: any) {
      console.error('Failed to update license:', err);
      alert(err.response?.data?.detail || 'Failed to update license');
    } finally {
      setSavingLicense(false);
    }
  };

  const handleCloseLicenseModal = () => {
    setEditLicenseModal(null);
    setLicenseTier('');
    setSeatsTotal('');
  };

  const handleConfirmAssignAdmin = async () => {
    if (!assignAdminModal || !selectedEmployee) return;

    try {
      setAssigningAdmin(true);

      await tenantAPI.assignAdmin(assignAdminModal.id, selectedEmployee.email);

      // Refresh tenant list
      await fetchTenants();

      // Close modal
      setAssignAdminModal(null);
      setSelectedEmployee(null);
      setEmployees([]);
      setEmployeeSearchTerm('');

      alert(`Successfully assigned ${selectedEmployee.full_name} as admin`);
    } catch (err: any) {
      console.error('Failed to assign admin:', err);
      console.error('Error response:', err.response?.data);

      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Failed to assign admin';

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        errorMessage = errorDetail.map((e: any) => e.msg || e.message).join(', ');
      }

      alert(errorMessage);
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleCloseAssignAdminModal = () => {
    setAssignAdminModal(null);
    setSelectedEmployee(null);
    setEmployees([]);
    setEmployeeSearchTerm('');
    setShowEmployeeDropdown(false);
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

  const handleTerminate = async (tenant: Tenant) => {
    setOpenDropdown(null);

    const confirmMessage = `⚠️ WARNING: This will permanently delete ${tenant.name} and all associated data including:

• ${tenant.admin_count} administrator(s)
• All employees and their data
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
      await fetchTenants();
      alert('Tenant terminated successfully');
    } catch (err: any) {
      console.error('Failed to terminate tenant:', err);
      alert(err.response?.data?.detail || 'Failed to terminate tenant');
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

      const payload = {
        name: formData.organizationName,
        subdomain: formData.domain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        domain: formData.domain,
        license_tier: formData.licenseType,
        seats_total: parseInt(formData.maxUsers),
        admin_email: formData.contactEmail,
        admin_name: formData.organizationName + ' Admin',
        country_code: 'UAE',
        data_residency_region: 'UAE'
      };

      console.log('Creating tenant with payload:', payload);

      await tenantAPI.create(payload);

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
      console.error('Error response:', err.response?.data);

      // Show detailed error message
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Failed to create tenant';

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        errorMessage = errorDetail.map((e: any) => e.msg || e.message).join(', ');
      }

      alert(errorMessage);
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
    <div className="space-y-6 pb-96 min-h-screen">
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
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-visible min-h-[800px]">
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
                      <div className="absolute left-full ml-2 top-0 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                        {/* Edit License */}
                        <button
                          onClick={() => handleEditLicense(tenant)}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit License</span>
                        </button>

                        {/* Assign Admin */}
                        <button
                          onClick={() => handleAssignAdmin(tenant)}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Assign Admin</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-slate-200 my-1" />

                        {/* Suspend or Unsuspend */}
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

                        {/* Divider */}
                        <div className="border-t border-slate-200 my-1" />

                        {/* Terminate */}
                        <button
                          onClick={() => handleTerminate(tenant)}
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
                  <select
                    value={formData.licenseType}
                    onChange={(e) => handleLicenseTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select License Type</option>
                    {licenseTiers.map((tier) => (
                      <option key={tier.name} value={tier.name}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Max Users (Read-only, auto-filled) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Users
                </label>
                <input
                  type="text"
                  placeholder="Auto-filled based on license type"
                  value={formData.maxUsers ? `${formData.maxUsers} users` : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
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

      {/* Edit License Modal */}
      {editLicenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit License</h2>
                <p className="text-sm text-slate-500 mt-1">Update license tier and seat allocation</p>
              </div>
              <button
                onClick={handleCloseLicenseModal}
                disabled={savingLicense}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Tenant Name (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={editLicenseModal.name}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* License Tier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  License Tier
                </label>
                <select
                  value={licenseTier}
                  onChange={(e) => handleEditLicenseTierChange(e.target.value)}
                  disabled={savingLicense}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white disabled:opacity-50"
                >
                  <option value="">Select License Tier</option>
                  {licenseTiers.map((tier) => (
                    <option key={tier.name} value={tier.name}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seats Total */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Seats
                </label>
                <input
                  type="number"
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(e.target.value)}
                  disabled={savingLicense}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter number of seats"
                />
              </div>

              {/* Current Usage Info */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-sm text-slate-600">
                  <strong>Current Usage:</strong> {editLicenseModal.seats_used} / {editLicenseModal.seats_total} seats
                </div>
                {seatsTotal && parseInt(seatsTotal) < editLicenseModal.seats_used && (
                  <div className="text-sm text-red-600 mt-1">
                    ⚠️ Warning: New seat count is less than current usage
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={handleCloseLicenseModal}
                disabled={savingLicense}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLicense}
                disabled={savingLicense || !licenseTier || !seatsTotal}
                className="px-4 py-2 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingLicense ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Admin Modal */}
      {assignAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Assign Admin</h2>
                <p className="text-sm text-slate-500 mt-1">Grant administrative access to employees</p>
              </div>
              <button
                onClick={handleCloseAssignAdminModal}
                disabled={assigningAdmin}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Tenant Name (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={assignAdminModal.name}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Select Admin - Searchable Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Admin
                </label>
                <div className="relative">
                  <div
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer flex items-center justify-between"
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                  >
                    {selectedEmployee ? (
                      <div>
                        <div className="font-medium text-slate-900">{selectedEmployee.full_name}</div>
                        <div className="text-xs text-slate-500">{selectedEmployee.email}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Select an employee</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Dropdown */}
                  {showEmployeeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-slate-200">
                        <input
                          type="text"
                          placeholder="Search employees..."
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Employee List */}
                      <div className="max-h-60 overflow-y-auto">
                        {loadingEmployees ? (
                          <div className="p-4 text-center text-slate-500">Loading employees...</div>
                        ) : filteredEmployees.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">No employees found</div>
                        ) : (
                          filteredEmployees.map((employee) => (
                            <button
                              key={employee.id}
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowEmployeeDropdown(false);
                                setEmployeeSearchTerm('');
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-medium text-slate-900">{employee.full_name}</div>
                              <div className="text-sm text-slate-500">{employee.email}</div>
                              {employee.department && (
                                <div className="text-xs text-slate-400 mt-1">{employee.department}</div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Currently Assigned Info */}
              {assignAdminModal.admin_count > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="text-sm text-slate-600">
                    <strong>Currently Assigned:</strong> {assignAdminModal.admin_count} admin{assignAdminModal.admin_count !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={handleCloseAssignAdminModal}
                disabled={assigningAdmin}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignAdmin}
                disabled={assigningAdmin || !selectedEmployee}
                className="px-4 py-2 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningAdmin ? 'Assigning...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
