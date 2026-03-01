/**
 * Reports & Compliance Page
 * Generate, preview, and export compliance and risk reports
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  Filter,
  TrendingUp,
  Shield,
  BarChart3,
  Plus,
  Eye
} from 'lucide-react';

export default function ReportsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <ReportsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function ReportsContent() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [showBuilder, setShowBuilder] = useState(false);
  const [reportType, setReportType] = useState('');
  const [filters, setFilters] = useState({
    dateRange: '30d',
    startDate: '',
    endDate: '',
    department: 'all',
    riskLevel: 'all'
  });
  const [showPreview, setShowPreview] = useState(false);

  const reportTypes = [
    {
      id: 'risk',
      name: 'Risk Report',
      description: 'Comprehensive risk analysis across organization',
      icon: Shield,
      color: 'from-red-500 to-rose-600'
    },
    {
      id: 'compliance',
      name: 'Compliance Report',
      description: 'Security compliance status and audit trail',
      icon: FileText,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'trend',
      name: 'Trend Analysis',
      description: 'Historical risk trends and predictions',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-600'
    }
  ];

  const handleGenerateReport = () => {
    if (!reportType) {
      alert('Please select a report type');
      return;
    }
    setShowPreview(true);
  };

  const handleExportPDF = () => {
    alert('PDF export functionality will be implemented with backend integration');
    // This would call backend API to generate PDF
  };

  const handleExportCSV = () => {
    alert('CSV export functionality will be implemented with backend integration');
    // This would call backend API to generate CSV
  };

  const handleShare = () => {
    const emails = prompt('Enter email addresses (comma-separated):');
    if (emails) {
      alert(`Report will be shared with: ${emails}\n\nBackend integration coming soon.`);
    }
  };

  if (!showBuilder) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Reports & Compliance
            </h1>
            <p className="text-slate-500 mt-1">
              Generate and export comprehensive security reports
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowBuilder(true)}
          >
            New Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Total Reports</div>
                <div className="text-2xl font-bold text-slate-900">0</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-slate-500">This Month</div>
                <div className="text-2xl font-bold text-slate-900">0</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Shared</div>
                <div className="text-2xl font-bold text-slate-900">0</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Reports - Empty State */}
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Yet</h3>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              Create your first report to analyze security metrics and share insights with stakeholders.
            </p>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowBuilder(true)}
            >
              Create Your First Report
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setShowPreview(false)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-2"
            >
              ← Back to Builder
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Report Preview
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              icon={<Share2 className="w-4 h-4" />}
              onClick={handleShare}
            >
              Share
            </Button>
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <Card className="p-8">
          <div className="space-y-6">
            {/* Report Header */}
            <div className="border-b border-slate-200 pb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 capitalize">
                {reportType} Report
              </h2>
              <div className="text-sm text-slate-500">
                Generated on {new Date().toLocaleDateString()} • Period: {filters.dateRange === '30d' ? 'Last 30 Days' : filters.dateRange === '90d' ? 'Last 90 Days' : 'Custom Range'}
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Executive Summary</h3>
              <p className="text-slate-600 mb-4">
                This {reportType} report provides a comprehensive overview of security metrics for the selected period.
                The analysis includes risk distribution, trend analysis, and actionable recommendations.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-xs text-red-600 font-semibold mb-1">High Risk Employees</div>
                  <div className="text-2xl font-bold text-slate-900">0</div>
                </div>
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
                  <div className="text-xs text-teal-600 font-semibold mb-1">Avg Risk Score</div>
                  <div className="text-2xl font-bold text-slate-900">N/A</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-600 font-semibold mb-1">Campaigns Run</div>
                  <div className="text-2xl font-bold text-slate-900">0</div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Detailed Metrics</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-2">Risk Distribution</div>
                  <div className="text-sm text-slate-600">
                    Analysis of employee risk levels across the organization
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-2">Campaign Performance</div>
                  <div className="text-sm text-slate-600">
                    Click rates, submission rates, and reporting rates from phishing campaigns
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-2">Department Comparison</div>
                  <div className="text-sm text-slate-600">
                    Risk score comparison across different departments
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Recommendations</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Focus additional training on departments with higher risk scores</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Run targeted phishing simulations for employees who previously failed</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Implement regular security awareness surveys to track improvement</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => setShowBuilder(false)}
          className="text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          ← Back to Reports
        </button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Create New Report
        </h1>
        <p className="text-slate-500 mt-1">
          Configure your report parameters
        </p>
      </div>

      {/* Report Type Selection */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = reportType === type.id;

            return (
              <div
                key={type.id}
                onClick={() => setReportType(type.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50 shadow-lg'
                    : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{type.name}</h3>
                <p className="text-sm text-slate-600">{type.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Filters</h2>
        <div className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-4 gap-3">
              {['7d', '30d', '90d', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setFilters({ ...filters, dateRange: range })}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    filters.dateRange === range
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-700 hover:border-teal-300'
                  }`}
                >
                  {range === '7d' && 'Last 7 Days'}
                  {range === '30d' && 'Last 30 Days'}
                  {range === '90d' && 'Last 90 Days'}
                  {range === 'custom' && 'Custom'}
                </button>
              ))}
            </div>
            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="finance">Finance</option>
              <option value="hr">Human Resources</option>
              <option value="sales">Sales</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Risk Level
            </label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setShowBuilder(false)}
        >
          Cancel
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<Eye className="w-4 h-4" />}
            onClick={handleGenerateReport}
            disabled={!reportType}
          >
            Preview Report
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              handleGenerateReport();
              setTimeout(handleExportPDF, 100);
            }}
            disabled={!reportType}
          >
            Generate & Export
          </Button>
        </div>
      </div>
    </div>
  );
}
