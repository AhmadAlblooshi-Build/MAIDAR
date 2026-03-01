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
import { Search, Upload, UserPlus, Download, Filter } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterRisk, setFilterRisk] = useState(searchParams.get('filter') === 'high-risk' ? 'high-risk' : 'all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadEmployees();
    loadStatistics();
  }, [currentPage, searchTerm, filterRole, filterRisk]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const searchParams: any = {
        page: currentPage,
        page_size: 10,
        search: searchTerm || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
      };

      // Apply high-risk filter if set
      if (filterRisk === 'high-risk') {
        searchParams.sort_by = 'risk_score';
        searchParams.sort_order = 'desc';
        searchParams.min_risk_score = 6; // High risk threshold
      }

      const response = await employeeAPI.search(searchParams);
      setEmployees(response.employees || []);
      setTotalPages(response.total_pages || 1);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await employeeAPI.statistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 8) return { variant: 'danger' as const, label: 'Critical', color: 'text-red-600' };
    if (score >= 6) return { variant: 'warning' as const, label: 'High', color: 'text-orange-600' };
    if (score >= 4) return { variant: 'warning' as const, label: 'Medium', color: 'text-yellow-600' };
    return { variant: 'success' as const, label: 'Low', color: 'text-green-600' };
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Employees
          </h1>
          <p className="text-slate-500 mt-1">
            Directory and Human Risk profiles for {statistics?.total_count?.toLocaleString() || '...'} managed people
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => alert('Bulk import functionality coming soon')}
          >
            Bulk Import
          </Button>
          <Button
            variant="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Employee
          </Button>
        </div>
      </div>

      {/* High-Risk Filter Indicator */}
      {filterRisk === 'high-risk' && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border-2 border-red-200">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-sm font-semibold text-red-900">
              Showing: High-Risk Employees Only (Risk Score ≥ 6.0)
            </span>
          </div>
          <button
            onClick={() => {
              setFilterRisk('all');
              router.push('/employees');
            }}
            className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Employees</div>
            <div className="text-2xl font-bold text-slate-900">{statistics.total_count}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600 mb-1">Average Risk Score</div>
            <div className="text-2xl font-bold text-orange-600">{statistics.avg_risk_score?.toFixed(1)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600 mb-1">High Risk</div>
            <div className="text-2xl font-bold text-red-600">{statistics.high_risk_count}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600 mb-1">Tech Literacy</div>
            <div className="text-2xl font-bold text-teal-600">{statistics.avg_technical_literacy?.toFixed(1)}/10</div>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'Engineer', label: 'Engineer' },
              { value: 'Manager', label: 'Manager' },
              { value: 'Executive', label: 'Executive' },
              { value: 'Analyst', label: 'Analyst' },
            ]}
          />
          <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>
            Filters
          </Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'full_name',
                  label: 'Employee',
                  render: (value: string, row: any) => (
                    <div>
                      <div className="font-semibold text-slate-900">{value}</div>
                      <div className="text-sm text-slate-500">{row.email}</div>
                    </div>
                  ),
                },
                {
                  key: 'department',
                  label: 'Dept & Role',
                  render: (value: string, row: any) => (
                    <div>
                      <div className="text-sm font-medium text-slate-900">{value}</div>
                      <div className="text-xs text-slate-500">{row.job_title}</div>
                    </div>
                  ),
                },
                {
                  key: 'risk_score',
                  label: 'Risk Index',
                  render: (value: number) => {
                    const badge = getRiskBadge(value);
                    return (
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className={`h-full ${getRiskColor(value)} rounded-full transition-all duration-500`}
                            style={{ width: `${(value / 10) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${badge.color} min-w-[30px]`}>
                          {value.toFixed(1)}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: () => <Badge variant="success" dot>Active</Badge>,
                },
                {
                  key: 'action',
                  label: 'Action',
                  render: (_, row: any) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/employees/${row.id}`);
                      }}
                    >
                      View
                    </Button>
                  ),
                },
              ]}
              data={employees}
              onRowClick={(row) => router.push(`/employees/${row.id}`)}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </Card>

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
