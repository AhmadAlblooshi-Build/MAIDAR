/**
 * Campaign Detail Page - Analytics & Results
 * Redesigned to match UX specifications
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { simulationAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, Download, Share2, Target } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      loadCampaignData();
    }
  }, [params.id]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const [campaignData, resultsData, statsData] = await Promise.all([
        simulationAPI.get(params.id as string),
        simulationAPI.getResults(params.id as string),
        simulationAPI.getStatistics(params.id as string),
      ]) as [any, any, any];

      setCampaign(campaignData);
      setResults(Array.isArray(resultsData) ? resultsData : resultsData.items || []);
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to load campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Campaign not found</p>
          <Button onClick={() => router.push('/campaigns')}>Back to Campaigns</Button>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalTargets = campaign.total_targets || 0;
  const openedCount = statistics?.email_opened_count || 0;
  const clickedCount = statistics?.link_clicked_count || 0;
  const reportedCount = results.filter((r: any) => r.reported_as_phishing).length;
  const completionRate = totalTargets > 0 ? Math.round((results.length / totalTargets) * 100) : 0;
  const openRate = statistics?.open_rate || 0;
  const clickRate = statistics?.click_rate || 0;
  const reportRate = totalTargets > 0 ? Math.round((reportedCount / totalTargets) * 100) : 0;

  // Calculate department vulnerability
  const departmentStats: Record<string, { total: number; clicked: number }> = {};
  results.forEach((result: any) => {
    const dept = result.employee?.department || 'Unknown';
    if (!departmentStats[dept]) {
      departmentStats[dept] = { total: 0, clicked: 0 };
    }
    departmentStats[dept].total++;
    if (result.link_clicked) {
      departmentStats[dept].clicked++;
    }
  });

  const departmentVulnerability = Object.entries(departmentStats)
    .map(([dept, stats]) => ({
      department: dept,
      percentage: stats.total > 0 ? Math.round((stats.clicked / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  // Calculate campaign duration
  const startDate = campaign.started_at ? new Date(campaign.started_at) : new Date(campaign.created_at);
  const endDate = campaign.completed_at ? new Date(campaign.completed_at) : new Date();
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/campaigns')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg">Back to Simulations</span>
        </button>

        <div className="flex gap-3">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="primary">
            <Share2 className="w-4 h-4 mr-2" />
            Share Report
          </Button>
        </div>
      </div>

      {/* Campaign Info Card */}
      <Card className="p-8">
        <div className="flex items-start gap-6">
          {/* Icon */}
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
            <Target className="w-8 h-8 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="mb-2">
              <span className="text-sm text-slate-500">Simulated Attack Results</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              {campaign.name}
              <span className="text-2xl">✨</span>
            </h1>
            <p className="text-slate-600 max-w-3xl">
              {campaign.description ||
                'Detailed breakdown of results from this phishing simulation campaign, including engagement metrics and organizational impact.'}
            </p>

            {/* Campaign Stats */}
            <div className="grid grid-cols-3 gap-8 mt-8">
              <div>
                <div className="text-sm text-slate-500 mb-1">Duration</div>
                <div className="text-2xl font-bold text-slate-900">{durationDays} Days</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Participants</div>
                <div className="text-2xl font-bold text-slate-900">
                  {results.length} / {totalTargets}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Type</div>
                <div className="text-2xl font-bold text-slate-900">Targeted Drill</div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="flex gap-4">
            {/* Success Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 min-w-[180px]">
              <div className="text-sm text-green-700 mb-2">Success</div>
              <div className="text-4xl font-bold text-green-600 mb-1">{completionRate}%</div>
              <div className="text-sm text-green-600">Completion</div>
            </div>

            {/* Impact Card */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-6 min-w-[180px]">
              <div className="text-sm text-rose-700 mb-2">Impact</div>
              <div className="text-4xl font-bold text-rose-600 mb-1">-{clickRate}%</div>
              <div className="text-sm text-rose-600">Risk Reduction</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Analytics Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Engagement Analytics - Donut Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Engagement Analytics</h2>

          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* SVG Donut Chart */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />

                {/* Reported segment (10%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#5eead4"
                  strokeWidth="12"
                  strokeDasharray={`${reportRate * 2.51} ${251 - reportRate * 2.51}`}
                  strokeDashoffset="0"
                  className="transition-all duration-1000"
                />

                {/* Clicked segment (30%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="12"
                  strokeDasharray={`${clickRate * 2.51} ${251 - clickRate * 2.51}`}
                  strokeDashoffset={`-${reportRate * 2.51}`}
                  className="transition-all duration-1000"
                />

                {/* Opened segment (60%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="12"
                  strokeDasharray={`${openRate * 2.51} ${251 - openRate * 2.51}`}
                  strokeDashoffset={`-${(reportRate + clickRate) * 2.51}`}
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-slate-900">{results.length}</div>
                <div className="text-sm text-slate-500">Total Hits</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-700"></div>
                <span className="text-sm text-slate-700">Opened</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{openRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                <span className="text-sm text-slate-700">Clicked</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{clickRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-300"></div>
                <span className="text-sm text-slate-700">Reported</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{reportRate}%</span>
            </div>
          </div>
        </Card>

        {/* Department Vulnerability Comparison */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Department Vulnerability Comparison</h2>

          <div className="space-y-4">
            {departmentVulnerability.length > 0 ? (
              departmentVulnerability.map((dept) => (
                <div key={dept.department}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{dept.department}</span>
                    <span className="text-sm font-semibold text-slate-900">{dept.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: `${dept.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">No department data available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
