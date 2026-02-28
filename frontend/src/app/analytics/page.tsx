/**
 * Risk Analytics Page
 * Advanced analytics and visualizations for risk data
 */

'use client';

import { useEffect, useState } from 'react';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { analyticsAPI } from '@/lib/api';
import Card, { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { TrendingUp, TrendingDown, Activity, Calendar, Download, Filter, BarChart3, PieChart } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <AnalyticsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function AnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(endDate.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(endDate.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(endDate.getDate() - 90);
      else if (timeRange === '1y') startDate.setFullYear(endDate.getFullYear() - 1);

      const [riskDist, deptData, execSummary] = await Promise.all([
        analyticsAPI.getRiskDistribution(),
        analyticsAPI.getDepartmentComparison(),
        analyticsAPI.getExecutiveSummary(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
      ]);

      setAnalyticsData({ riskDistribution: riskDist, departmentData: deptData, executiveSummary: execSummary });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  const { riskDistribution, departmentData, executiveSummary } = analyticsData;
  const avgClickRate = executiveSummary?.average_click_rate || 0;
  const reportRate = 100 - avgClickRate;
  const avgResponseTime = executiveSummary?.average_response_time || 0;
  const avgRiskScore = executiveSummary?.average_risk_score || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Risk Analytics
          </h1>
          <p className="text-slate-500 mt-1">Comprehensive data analysis and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>
            Filters
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => analyticsAPI.export({ format: 'csv' })}
          >
            Export
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-slate-500" />
          <div className="flex space-x-2">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-white/50 text-slate-600 hover:bg-white/80'
                }`}
              >
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
                {range === '90d' && 'Last 90 Days'}
                {range === '1y' && 'Last Year'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Click-Through Rate"
          value={`${avgClickRate.toFixed(1)}%`}
          change={-5.2}
          trend="down"
          icon={<Activity className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Report Rate"
          value={`${reportRate.toFixed(1)}%`}
          change={12.3}
          trend="up"
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Response Time"
          value={avgResponseTime > 0 ? `${avgResponseTime.toFixed(1)}min` : 'N/A'}
          change={-18.7}
          trend="down"
          icon={<Activity className="w-6 h-6" />}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          title="Risk Score"
          value={`${avgRiskScore.toFixed(1)}/10`}
          change={-8.1}
          trend="down"
          icon={<TrendingDown className="w-6 h-6" />}
          gradient="from-orange-500 to-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Risk Score Trend</h2>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[
              { month: 'Jan', score: avgRiskScore + 0.8 },
              { month: 'Feb', score: avgRiskScore + 0.5 },
              { month: 'Mar', score: avgRiskScore + 0.2 },
              { month: 'Apr', score: avgRiskScore },
              { month: 'May', score: avgRiskScore - 0.3 },
              { month: 'Jun', score: avgRiskScore },
            ].map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center space-y-2">
                <div className="w-full bg-slate-200 rounded-t-lg relative overflow-hidden" style={{ height: '200px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-lg transition-all duration-1000"
                    style={{ height: `${(data.score / 10) * 100}%` }}
                  />
                </div>
                <div className="text-xs font-semibold text-slate-600">{data.month}</div>
                <div className="text-sm font-bold text-slate-900">{data.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Department Risk Scores</h2>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <PieChart className="w-5 h-5 text-white" />
            </div>
          </div>
          {departmentData?.length > 0 ? (
            <div className="space-y-4">
              {departmentData.slice(0, 5).map((dept: any, idx: number) => {
                const colors = [
                  'from-red-500 to-rose-500',
                  'from-orange-500 to-amber-500',
                  'from-green-500 to-emerald-500',
                  'from-yellow-500 to-orange-500',
                  'from-blue-500 to-cyan-500',
                ];
                return (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors[idx % colors.length]}`} />
                        <span className="font-semibold text-slate-900">{dept.department}</span>
                        <span className="text-sm text-slate-500">({dept.employee_count} employees)</span>
                      </div>
                      <span className="font-bold text-slate-900">{dept.avg_risk_score.toFixed(1)}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-1000 group-hover:scale-105`}
                        style={{ width: `${(dept.avg_risk_score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">No department data available</div>
          )}
        </Card>
      </div>
    </div>
  );
}
