/**
 * Campaign Status & Performance Tracking Page
 * Live tracking of campaign metrics and employee responses
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  Target,
  Mail,
  MousePointer,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';

export default function CampaignDetailPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <CampaignDetailContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function CampaignDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadCampaignData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadCampaignData, 30000);
      return () => clearInterval(interval);
    }
  }, [params.id]);

  const loadCampaignData = async () => {
    try {
      setRefreshing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const [campaignRes, resultsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/simulations/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/simulations/${params.id}/results`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!campaignRes.ok) {
        throw new Error('Failed to load campaign');
      }

      const campaignData = await campaignRes.json();
      const resultsData = await resultsRes.json();

      setCampaign(campaignData);
      setResults(Array.isArray(resultsData) ? resultsData : resultsData.items || []);
    } catch (err: any) {
      console.error('Failed to load campaign:', err);
      setError(err.message || 'Failed to load campaign data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Campaign not found'}</p>
          <Button onClick={() => router.push('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'scheduled':
        return <Badge variant="info">Scheduled</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  const calculateMetrics = () => {
    const total = campaign.target_count || 0;
    const sent = campaign.sent_count || 0;
    const opened = campaign.opened_count || 0;
    const clicked = campaign.clicked_count || 0;
    const submitted = campaign.submitted_count || 0;
    const reported = campaign.reported_count || 0;

    return {
      total,
      sent,
      opened,
      clicked,
      submitted,
      reported,
      openRate: total > 0 ? ((opened / sent) * 100).toFixed(1) : '0',
      clickRate: total > 0 ? ((clicked / sent) * 100).toFixed(1) : '0',
      submitRate: total > 0 ? ((submitted / sent) * 100).toFixed(1) : '0',
      reportRate: total > 0 ? ((reported / sent) * 100).toFixed(1) : '0'
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/campaigns')}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            ← Back to Campaigns
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {campaign.name}
          </h1>
          <p className="text-slate-500 mt-1">{campaign.description}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            onClick={loadCampaignData}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => alert('Export functionality coming soon')}
          >
            Export Results
          </Button>
          {getStatusBadge()}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Sent</div>
              <div className="text-2xl font-bold text-slate-900">{metrics.sent}</div>
              <div className="text-xs text-slate-500">of {metrics.total} targets</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Opened</div>
              <div className="text-2xl font-bold text-slate-900">{metrics.opened}</div>
              <div className="text-xs text-teal-600 font-medium">{metrics.openRate}% open rate</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <MousePointer className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Clicked</div>
              <div className="text-2xl font-bold text-slate-900">{metrics.clicked}</div>
              <div className="text-xs text-orange-600 font-medium">{metrics.clickRate}% click rate</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Submitted Credentials</div>
              <div className="text-2xl font-bold text-slate-900">{metrics.submitted}</div>
              <div className="text-xs text-red-600 font-medium">{metrics.submitRate}% submitted</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Campaign Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Emails Sent</span>
                <span className="text-sm font-bold text-slate-900">{metrics.sent} / {metrics.total}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                  style={{ width: `${(metrics.sent / metrics.total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Open Rate</span>
                <span className="text-sm font-bold text-teal-600">{metrics.openRate}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${metrics.openRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Click Rate</span>
                <span className="text-sm font-bold text-orange-600">{metrics.clickRate}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                  style={{ width: `${metrics.clickRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Submission Rate</span>
                <span className="text-sm font-bold text-red-600">{metrics.submitRate}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full transition-all"
                  style={{ width: `${metrics.submitRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Reported Phishing</span>
                <span className="text-sm font-bold text-green-600">{metrics.reportRate}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${metrics.reportRate}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Campaign Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-600">Status</span>
              <span className="font-semibold">{getStatusBadge()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-600">Created</span>
              <span className="font-semibold text-slate-900">
                {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-600">Scenario</span>
              <span className="font-semibold text-slate-900">{campaign.scenario?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-600">Target Count</span>
              <span className="font-semibold text-slate-900">{metrics.total} employees</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Individual Results */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Employee Responses</h2>
          <div className="text-sm text-slate-500">
            {results.length} results
          </div>
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Opened</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Clicked</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((result: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{result.employee?.full_name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{result.employee?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      {result.email_sent ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {result.email_opened ? (
                        <CheckCircle className="w-5 h-5 text-teal-600" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {result.link_clicked ? (
                        <CheckCircle className="w-5 h-5 text-orange-600" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {result.credentials_submitted ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {result.reported_phishing ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            No results yet. Campaign is still in progress.
          </div>
        )}
      </Card>
    </div>
  );
}
