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
import { Search, Upload, UserPlus, MoreHorizontal, Download, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

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
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setDeleting(true);

      // Delete all employees one by one
      const deletePromises = employees.map(emp => employeeAPI.delete(emp.id));
      await Promise.all(deletePromises);

      // Reload employees list
      await loadEmployees();
      setShowDeleteConfirmModal(false);
      alert(`Successfully deleted ${employees.length} employees`);
    } catch (error) {
      console.error('Failed to delete employees:', error);
      alert('Failed to delete employees. Please try again.');
    } finally {
      setDeleting(false);
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
            onClick={() => setShowBulkImportModal(true)}
            className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Bulk Import
          </button>
          <button
            onClick={() => setShowDeleteConfirmModal(true)}
            disabled={employees.length === 0}
            className="px-6 py-2.5 rounded-lg bg-white border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bulk Delete
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

      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          setShowBulkImportModal(false);
          loadEmployees();
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bulk Delete Employees</h2>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900 font-medium mb-2">
                ⚠️ Warning: You are about to delete all employees on this page
              </p>
              <p className="text-sm text-red-800">
                This will permanently delete <strong>{employees.length} employees</strong> and all their associated data including:
              </p>
              <ul className="text-sm text-red-800 mt-2 ml-4 list-disc space-y-1">
                <li>Risk scores and history</li>
                <li>Simulation results</li>
                <li>Survey responses</li>
              </ul>
            </div>

            <p className="text-slate-700 mb-6 font-medium">
              Are you sure you want to delete all {employees.length} employees?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleting}
                className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Delete All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
    age_range: '25_34',
    technical_literacy: 5,
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
          label="Age Range"
          required
          value={formData.age_range}
          onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
          options={[
            { value: '18_24', label: '18-24' },
            { value: '25_34', label: '25-34' },
            { value: '35_44', label: '35-44' },
            { value: '45_54', label: '45-54' },
            { value: '55_plus', label: '55+' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Technical Literacy (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            required
            value={formData.technical_literacy}
            onChange={(e) => setFormData({ ...formData, technical_literacy: parseInt(e.target.value) })}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-500 mt-1">1 = Low, 10 = High technical skills</p>
        </div>
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

function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      const result = await employeeAPI.uploadCSV(selectedFile) as any;
      setUploadResult(result);
      setSelectedFile(null);

      // If successful, refresh the employee list after a short delay
      if (result?.successful > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file. Please check the format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'employee_id,email,full_name,age_range,gender,languages,technical_literacy,seniority,department,job_title\n' +
      'EMP001,john@company.com,John Doe,25_34,male,"en",8,Mid-Level,Engineering,Software Engineer\n' +
      'EMP002,jane@company.com,Jane Smith,35_44,female,"en",6,Senior,Sales,Account Executive\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Employees"
      subtitle="Upload a CSV file to import multiple employees at once"
    >
      <div className="space-y-6">
        {/* Download Template Button */}
        <div className="flex justify-end">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>

        {/* File Upload Area */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="bulk-csv-upload"
          />
          <label htmlFor="bulk-csv-upload" className="cursor-pointer">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Click to select CSV file
                </p>
                <p className="text-xs text-slate-500">
                  Supported format: CSV (max 5MB)
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className={`p-4 rounded-lg ${
            uploadResult.successful > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {uploadResult.successful > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${
                  uploadResult.successful > 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  Import Results
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Successfully imported:</span>
                    <span className="font-semibold text-green-600">
                      {uploadResult.successful || 0} employees
                    </span>
                  </div>
                  {uploadResult.failed > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Failed:</span>
                      <span className="font-semibold text-red-600">
                        {uploadResult.failed} rows
                      </span>
                    </div>
                  )}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="font-semibold text-red-900 mb-2">Errors:</div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {uploadResult.errors.slice(0, 10).map((error: any, idx: number) => (
                          <div key={idx} className="text-xs text-red-800 bg-red-100 p-2 rounded">
                            Row {error.row}: {error.error}
                            {error.employee_id && ` (ID: ${error.employee_id})`}
                          </div>
                        ))}
                        {uploadResult.errors.length > 10 && (
                          <div className="text-xs text-red-700 italic">
                            ...and {uploadResult.errors.length - 10} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <div className="font-semibold mb-2">CSV Import Guidelines</div>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li>Download the template to ensure correct column format</li>
                <li>Required: employee_id, email, full_name, age_range, technical_literacy, seniority, department</li>
                <li>Age range: 18_24, 25_34, 35_44, 45_54, 55_plus</li>
                <li>Technical literacy: 1-10 (numeric)</li>
                <li>Seniority: Entry, Mid-Level, Senior, Executive</li>
                <li>Email addresses must be unique</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedFile(null);
              setUploadResult(null);
              onClose();
            }}
          >
            {uploadResult?.successful > 0 ? 'Close' : 'Cancel'}
          </Button>
          {selectedFile && !uploadResult && (
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              loading={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload & Import'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
