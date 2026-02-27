/**
 * Super Admin - Audit Log Page
 * Cryptographic audit trail for all platform activities
 */

'use client';

import { useState } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Table, { Pagination } from '@/components/ui/Table';
import { Search, Download, Filter, Calendar, Shield, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';

export default function AuditLogPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <AuditLogContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  tenant_name?: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failed' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  hash: string;
}

function AuditLogContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState('24h');
  const [showFilters, setShowFilters] = useState(false);

  // Mock audit log data
  const auditLogs: AuditLog[] = [
    {
      id: '1',
      timestamp: '2024-02-27T14:32:15Z',
      actor: 'admin@platform.com',
      actor_role: 'PLATFORM_SUPER_ADMIN',
      action: 'tenant.suspend',
      resource_type: 'Tenant',
      resource_id: 'tenant_4',
      tenant_name: 'Retail Solutions',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
      severity: 'high',
      details: 'Tenant suspended due to payment failure',
      hash: 'a7f3c9d8e2b4f1a6c8e5d3b7f9c2a1e4',
    },
    {
      id: '2',
      timestamp: '2024-02-27T14:28:42Z',
      actor: 'sarah.johnson@acme.com',
      actor_role: 'TENANT_ADMIN',
      action: 'user.delete',
      resource_type: 'User',
      resource_id: 'user_892',
      tenant_name: 'Acme Corporation',
      ip_address: '10.0.45.23',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'success',
      severity: 'medium',
      details: 'Employee removed from organization',
      hash: 'b2e8f4a9c7d3e1b5a8c6f2d9e4b7c3a1',
    },
    {
      id: '3',
      timestamp: '2024-02-27T14:15:33Z',
      actor: 'admin@platform.com',
      actor_role: 'PLATFORM_SUPER_ADMIN',
      action: 'tenant.create',
      resource_type: 'Tenant',
      resource_id: 'tenant_5',
      tenant_name: 'NewTech Industries',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
      severity: 'medium',
      details: 'New tenant organization created with Enterprise license',
      hash: 'c9d4e7a2b8f3c1e5a9d6b4f8c2e7a3b1',
    },
    {
      id: '4',
      timestamp: '2024-02-27T13:58:17Z',
      actor: 'system',
      actor_role: 'SYSTEM',
      action: 'auth.login_failed',
      resource_type: 'Authentication',
      resource_id: 'auth_attempt_4782',
      ip_address: '203.45.78.92',
      user_agent: 'Python-requests/2.28.1',
      status: 'failed',
      severity: 'critical',
      details: 'Multiple failed login attempts detected - potential brute force attack',
      hash: 'd3e9a7f4c2b8e1a6d5c9f3b7e2a8c4d1',
    },
    {
      id: '5',
      timestamp: '2024-02-27T13:42:51Z',
      actor: 'mchen@techstart.io',
      actor_role: 'TENANT_ADMIN',
      action: 'license.update',
      resource_type: 'License',
      resource_id: 'license_22',
      tenant_name: 'TechStart Inc',
      ip_address: '172.16.8.45',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      status: 'success',
      severity: 'low',
      details: 'License upgraded from Professional to Enterprise (500 → 1000 seats)',
      hash: 'e4f8c3a9d7b2e6a1c8f5d3b9e7c2a4f1',
    },
    {
      id: '6',
      timestamp: '2024-02-27T13:25:08Z',
      actor: 'admin@platform.com',
      actor_role: 'PLATFORM_SUPER_ADMIN',
      action: 'role.create',
      resource_type: 'Role',
      resource_id: 'role_8',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
      severity: 'medium',
      details: 'New custom role created: "Support Manager" with 8 permissions',
      hash: 'f7c9e2a8b3d6f1e5c9a7d4b8f2e6c3a9',
    },
    {
      id: '7',
      timestamp: '2024-02-27T12:58:32Z',
      actor: 'emily.r@globalfinance.com',
      actor_role: 'TENANT_ADMIN',
      action: 'simulation.launch',
      resource_type: 'Simulation',
      resource_id: 'sim_445',
      tenant_name: 'Global Finance Ltd',
      ip_address: '10.20.30.40',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      severity: 'low',
      details: 'Phishing simulation launched targeting 2,890 employees',
      hash: 'a2d8f5c9e3b7a6d4f8c2e9b5d7a3f1c8',
    },
    {
      id: '8',
      timestamp: '2024-02-27T12:34:19Z',
      actor: 'system',
      actor_role: 'SYSTEM',
      action: 'backup.complete',
      resource_type: 'System',
      resource_id: 'backup_daily_2024_02_27',
      ip_address: '127.0.0.1',
      user_agent: 'System/Automated',
      status: 'success',
      severity: 'low',
      details: 'Daily automated backup completed successfully (48.2 GB)',
      hash: 'b8e3f9c2a7d5e1b9c6f4a8d3e7b2c5f9',
    },
  ];

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
    if (action.includes('delete') || action.includes('suspend') || action.includes('terminate')) {
      return 'text-red-600 bg-red-50';
    }
    if (action.includes('create') || action.includes('launch')) {
      return 'text-green-600 bg-green-50';
    }
    if (action.includes('update') || action.includes('modify')) {
      return 'text-blue-600 bg-blue-50';
    }
    return 'text-slate-600 bg-slate-50';
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action.includes(filterAction);
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesAction && matchesSeverity && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / 10);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * 10, currentPage * 10);

  const stats = {
    total_logs: auditLogs.length,
    critical_events: auditLogs.filter(l => l.severity === 'critical').length,
    failed_actions: auditLogs.filter(l => l.status === 'failed').length,
    success_rate: ((auditLogs.filter(l => l.status === 'success').length / auditLogs.length) * 100).toFixed(1),
  };

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
        <Button
          variant="primary"
          icon={<Download className="w-4 h-4" />}
        >
          Export Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <div className="text-sm text-slate-600">Total Events</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total_logs.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-slate-600">Critical Events</div>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.critical_events}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-5 h-5 text-orange-400" />
            <div className="text-sm text-slate-600">Failed Actions</div>
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.failed_actions}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div className="text-sm text-slate-600">Success Rate</div>
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.success_rate}%</div>
        </Card>
      </div>

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

        <div className="mt-6">
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
                render: (value: string) => (
                  <div className="text-xs font-mono text-slate-600">{value}</div>
                ),
              },
              {
                key: 'hash',
                label: 'Hash',
                render: (value: string) => (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-3 h-3 text-green-600" />
                    <div className="text-xs font-mono text-slate-600 truncate max-w-[100px]">
                      {value.slice(0, 12)}...
                    </div>
                  </div>
                ),
              },
            ]}
            data={paginatedLogs}
            onRowClick={(row) => console.log('View audit log details:', row.id)}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-blue-900 mb-1">
              Cryptographic Integrity Verification
            </h3>
            <p className="text-sm text-blue-800">
              All audit logs are cryptographically hashed and immutable. Each entry is chained to the previous entry,
              ensuring tamper-proof audit trail compliance with SOC 2, ISO 27001, and GDPR requirements.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
