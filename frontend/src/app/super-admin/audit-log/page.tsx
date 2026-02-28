/**
 * Super Admin - Audit Log Page
 * Enterprise-grade cryptographic audit trail with real API integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import { Search, Download, Filter, Calendar, Shield, AlertTriangle, CheckCircle, Info, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { auditLogAPI } from '@/lib/api';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  tenant_name?: string;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  severity: string;
  details: string;
  hash: string;
}

export default function AuditLogPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <AuditLogContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function AuditLogContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState('24h');
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  // Fetch audit logs
  const fetchLogs = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      const response: any = await auditLogAPI.search({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
        action_type: filterAction !== 'all' ? filterAction : undefined,
        severity: filterSeverity !== 'all' ? filterSeverity : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
      });

      setLogs(response.logs);
      setTotalCount(response.total);
      setTotalPages(response.total_pages);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.response?.data?.detail || 'Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchTerm, filterAction, filterSeverity, filterStatus, dateRange, pageSize]);

  // Initial load and refresh on filters
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Calculate statistics
  const criticalCount = logs.filter(l => l.severity === 'critical').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const successRate = logs.length > 0
    ? ((logs.filter(l => l.status === 'success').length / logs.length) * 100).toFixed(1)
    : '0.0';

  const handleRefresh = () => {
    fetchLogs(false);
  };

  const handleExport = async () => {
    try {
      // This would call an export endpoint
      alert('Exporting audit logs... (Feature coming soon)');
    } catch (err) {
      console.error('Failed to export logs:', err);
      alert('Failed to export logs');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="danger">Critical</Badge>;
      case 'high':
        return <Badge variant="warning">High</Badge>;
      case 'medium':
        return <Badge variant="info">Medium</Badge>;
      default:
        return <Badge variant="neutral">Low</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <Info className="w-4 h-4 text-orange-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('delete') || actionLower.includes('suspend') || actionLower.includes('terminate')) {
      return 'text-red-600 bg-red-50';
    }
    if (actionLower.includes('create') || actionLower.includes('launch')) {
      return 'text-green-600 bg-green-50';
    }
    if (actionLower.includes('update') || actionLower.includes('modify')) {
      return 'text-blue-600 bg-blue-50';
    }
    return 'text-slate-600 bg-slate-50';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-slate-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Audit Logs</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => fetchLogs()} variant="primary">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Audit Log
          </h1>
          <p className="text-slate-500 mt-1">
            Cryptographic audit trail of all platform activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export Logs
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <div className="text-sm text-slate-600">Total Events</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCount.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-slate-600">Critical Events</div>
          </div>
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-5 h-5 text-orange-400" />
            <div className="text-sm text-slate-600">Failed Actions</div>
          </div>
          <div className="text-2xl font-bold text-orange-600">{failedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div className="text-sm text-slate-600">Success Rate</div>
          </div>
          <div className="text-2xl font-bold text-green-600">{successRate}%</div>
        </Card>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-slate-500" />
          <div className="flex space-x-2">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                  dateRange === range
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-white/50 text-slate-600 hover:bg-white/80'
                }`}
              >
                {range === '1h' && 'Last Hour'}
                {range === '24h' && 'Last 24h'}
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Filters and Search */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by actor, action, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="secondary"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <Select
                label="Action Type"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                options={[
                  { value: 'all', label: 'All Actions' },
                  { value: 'create', label: 'Create' },
                  { value: 'update', label: 'Update' },
                  { value: 'delete', label: 'Delete' },
                  { value: 'suspend', label: 'Suspend' },
                  { value: 'login', label: 'Authentication' },
                ]}
              />
              <Select
                label="Severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                options={[
                  { value: 'all', label: 'All Severities' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
              <Select
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'warning', label: 'Warning' },
                ]}
              />
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="mt-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No audit logs found</h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || filterAction !== 'all' || filterSeverity !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No events recorded in the selected time range'}
              </p>
            </div>
          ) : (
            <>
              <Table
                columns={[
                  {
                    key: 'timestamp',
                    label: 'Timestamp',
                    render: (value: string) => {
                      const date = new Date(value);
                      return (
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">
                            {date.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {date.toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actor',
                    label: 'Actor',
                    render: (value: string, row: AuditLog) => (
                      <div>
                        <div className="text-sm font-medium text-slate-900">{value}</div>
                        <div className="text-xs text-slate-500">{row.actor_role}</div>
                        {row.tenant_name && (
                          <div className="text-xs text-teal-600">{row.tenant_name}</div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'action',
                    label: 'Action',
                    render: (value: string, row: AuditLog) => (
                      <div className="space-y-1">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getActionColor(value)}`}>
                          {getStatusIcon(row.status)}
                          <span>{value}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {row.resource_type}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'details',
                    label: 'Details',
                    render: (value: string) => (
                      <div className="text-sm text-slate-600 max-w-md truncate">
                        {value}
                      </div>
                    ),
                  },
                  {
                    key: 'severity',
                    label: 'Severity',
                    render: (value: string) => getSeverityBadge(value),
                  },
                  {
                    key: 'ip_address',
                    label: 'IP Address',
                    render: (value: string | null) => (
                      <div className="text-xs font-mono text-slate-600">{value || 'N/A'}</div>
                    ),
                  },
                  {
                    key: 'hash',
                    label: 'Hash',
                    render: (value: string) => (
                      <div className="flex items-center space-x-2">
                        <Shield className="w-3 h-3 text-green-600" />
                        <div className="text-xs font-mono text-slate-600 truncate max-w-[100px]" title={value}>
                          {value.slice(0, 12)}...
                        </div>
                      </div>
                    ),
                  },
                ]}
                data={logs}
                onRowClick={(row) => console.log('View audit log details:', row.id)}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} events
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-teal-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Security Notice */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-blue-900 mb-1">
              Cryptographic Integrity Verification
            </h3>
            <p className="text-sm text-blue-800">
              All audit logs are cryptographically hashed (SHA-256) and immutable. Each entry is chained to the previous entry,
              ensuring tamper-proof audit trail compliance with SOC 2, ISO 27001, GDPR, and UAE PDPL requirements.
              Hash verification guarantees data integrity and non-repudiation.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
