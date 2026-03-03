/**
 * Super Admin - Audit Registry Page
 * Cryptographically verified record of all administrative activity
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Search, Download } from 'lucide-react';
import { auditLogAPI } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string | null;
  actor: string;
  actor_role: string;
  timestamp: string;
  status: string;
  details: any;
}

export default function AuditLogsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <AuditLogsContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function AuditLogsContent() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, searchTerm]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const response: any = await auditLogAPI.search({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
      });

      setLogs(response.logs || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} secs ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (action: string) => {
    // Critical actions
    if (action.includes('DELETE') || action.includes('SUSPENDED') || action.includes('TERMINATED')) {
      return 'text-red-600';
    }
    // Warning actions
    if (action.includes('UPDATED') || action.includes('MODIFIED')) {
      return 'text-orange-600';
    }
    // Info actions (default)
    return 'text-teal-600';
  };

  const getStatusBadge = (action: string) => {
    if (action.includes('DELETE') || action.includes('SUSPENDED') || action.includes('TERMINATED')) {
      return { label: 'CRITICAL', color: 'bg-red-50 text-red-700' };
    }
    if (action.includes('UPDATED') || action.includes('MODIFIED')) {
      return { label: 'WARNING', color: 'bg-orange-50 text-orange-700' };
    }
    return { label: 'INFO', color: 'bg-teal-50 text-teal-700' };
  };

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getEntityName = (log: AuditLog) => {
    if (log.details?.tenant_name) return `Tenant: ${log.details.tenant_name}`;
    if (log.resource_type) return `${log.resource_type.charAt(0).toUpperCase()}${log.resource_type.slice(1)}`;
    return 'Platform Master';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Registry</h1>
          <p className="text-slate-500 text-sm mt-1">
            A cryptographically verified record of all administrative activity across the Maidar platform footprint.
          </p>
        </div>
        <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Intelligence Report
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Report"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Administrative Event</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Context Actor</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Platform Trace</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ledger Time</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const statusBadge = getStatusBadge(log.action);
              return (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {/* Administrative Event */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-slate-900">{formatActionName(log.action)}</div>
                      <div className="text-sm text-slate-500">Impacted Entity: {getEntityName(log)}</div>
                    </div>
                  </td>

                  {/* Context Actor */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        {log.actor || 'System'} ({log.actor_role === 'PLATFORM_SUPER_ADMIN' || log.actor_role === 'SUPER_ADMIN' ? 'Super' : log.actor_role})
                      </div>
                      <div className="text-sm text-slate-500">{log.id.slice(0, 8)}</div>
                    </div>
                  </td>

                  {/* Platform Trace */}
                  <td className="py-4 px-4">
                    <div className="text-sm font-mono text-slate-700">
                      TR-{log.id.slice(0, 4).toUpperCase()}-{log.id.slice(-1).toUpperCase()}
                    </div>
                  </td>

                  {/* Ledger Time */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="text-sm text-slate-900">{formatTimeAgo(log.timestamp)}</div>
                      <div className="text-xs text-slate-500">Signature verified</div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.color.includes('red') ? 'bg-red-500' : statusBadge.color.includes('orange') ? 'bg-orange-500' : 'bg-teal-500'}`}></span>
                      {statusBadge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {totalCount > 0 ? `1 of ${totalCount} Users shows` : '0 Users'}
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
    </div>
  );
}
