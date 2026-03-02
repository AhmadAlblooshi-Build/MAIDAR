/**
 * Employees Directory Page
 * Manage employees with risk profiles and bulk operations
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { employeeAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Table, { Pagination } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { Search, Upload, UserPlus, MoreHorizontal } from 'lucide-react';

export default function EmployeesPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <EmployeesContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [currentPage, searchTerm, filterRole]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const searchParams: any = {
        page: currentPage,
        page_size: 12,
        search: searchTerm || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
      };

      const response = await employeeAPI.search(searchParams);
      setEmployees(response.employees || []);
      setTotalPages(response.total_pages || 1);
      setTotalCount(response.total_count || 0);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (score: number) => {
    // Convert 0-10 scale to 0-100 for display
    const displayScore = Math.round(score * 10);

    if (score >= 7) return {
      label: 'High',
      displayScore,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200'
    };
    if (score >= 4) return {
      label: 'Medium',
      displayScore,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    };
    return {
      label: 'Low',
      displayScore,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-200'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold text-slate-900">
            Employees
          </h1>
          <p className="text-slate-500 mt-1">
            Directory and Human Risk profiles for {totalCount.toLocaleString()} managed people.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Bulk import functionality coming soon')}
            className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Bulk Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:shadow-lg transition-all"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Roles</option>
          <option value="LEAD DEV">Lead Dev</option>
          <option value="DESIGNER">Designer</option>
          <option value="MANAGER">Manager</option>
          <option value="EXECUTIVE">Executive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dept & Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Risk Index
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employees.map((employee) => {
                  const riskBadge = getRiskBadge(employee.risk_score || 0);
                  return (
                    <tr
                      key={employee.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/employees/${employee.id}`)}
                    >
                      {/* Employee */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{employee.full_name}</div>
                        <div className="text-sm text-slate-500">{employee.email}</div>
                      </td>

                      {/* Dept & Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{employee.department}</div>
                        <div className="text-xs text-slate-500 uppercase">{employee.job_title}</div>
                      </td>

                      {/* Risk Index */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium ${riskBadge.bgColor} ${riskBadge.textColor} border ${riskBadge.borderColor}`}
                        >
                          {riskBadge.label} {riskBadge.displayScore}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          <span className="text-sm text-slate-700">Active</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add action menu
                          }}
                          className="p-1 rounded hover:bg-slate-200 transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {employees.length > 0
                  ? `1 of ${totalPages} Users shows`
                  : 'No employees found'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="text-slate-400">...</span>}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadEmployees();
        }}
      />
    </div>
  );
}

function AddEmployeeModal({
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
    full_name: '',
    email: '',
    department: '',
    job_title: '',
    seniority: 'Mid-Level',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await employeeAPI.create(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Employee" subtitle="Add a new employee to your organization">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="John Doe"
        />
        <Input
          label="Email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@company.com"
        />
        <Input
          label="Department"
          required
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="Engineering"
        />
        <Input
          label="Job Title"
          required
          value={formData.job_title}
          onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
          placeholder="Software Engineer"
        />
        <Select
          label="Seniority"
          required
          value={formData.seniority}
          onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
          options={[
            { value: 'Entry', label: 'Entry Level' },
            { value: 'Mid-Level', label: 'Mid-Level' },
            { value: 'Senior', label: 'Senior' },
            { value: 'Executive', label: 'Executive' },
          ]}
        />
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Add Employee
          </Button>
        </div>
      </form>
    </Modal>
  );
}
