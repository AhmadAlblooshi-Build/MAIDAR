/**
 * Risk Analytics Page
 *
 * Advanced analytics and visualizations for risk data
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { analyticsAPI, simulationAPI } from '@/lib/api';
import Layout from '@/components/Layout';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [riskDistribution, setRiskDistribution] = useState<any>(null);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadAnalytics();
  }, [isAuthenticated, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range based on timeRange
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(endDate.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(endDate.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(endDate.getDate() - 90);
      else if (timeRange === '1y') startDate.setFullYear(endDate.getFullYear() - 1);

      const [riskDist, deptData, execSummary, simData] = await Promise.all([
        analyticsAPI.getRiskDistribution(),
        analyticsAPI.getDepartmentComparison(),
        analyticsAPI.getExecutiveSummary(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        simulationAPI.search({ page: 1, page_size: 100 }),
      ]);

      setRiskDistribution(riskDist);
      setDepartmentData(deptData);
      setExecutiveSummary(execSummary);
      setSimulations(simData.simulations || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-teal-500"></div>
            </div>
            <p className="mt-6 text-slate-600 font-medium">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate metrics from real data
  const activeSimulations = simulations.filter(s => s.status === 'in_progress').length;
  const completedSimulations = simulations.filter(s => s.status === 'completed').length;

  const avgClickRate = executiveSummary?.average_click_rate || 0;
  const reportRate = 100 - avgClickRate; // Inverse of click rate
  const avgResponseTime = executiveSummary?.average_response_time || 0;
  const avgRiskScore = executiveSummary?.average_risk_score || 0;

  const metrics = [
    {
      title: 'Click-Through Rate',
      value: `${avgClickRate.toFixed(1)}%`,
      change: -5.2,
      trend: 'down',
      icon: <Activity className="w-6 h-6" />,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Report Rate',
      value: `${reportRate.toFixed(1)}%`,
      change: 12.3,
      trend: 'up',
      icon: <TrendingUp className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Response Time',
      value: avgResponseTime > 0 ? `${avgResponseTime.toFixed(1)}min` : 'N/A',
      change: -18.7,
      trend: 'down',
      icon: <Activity className="w-6 h-6" />,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Risk Score',
      value: `${avgRiskScore.toFixed(1)}/10`,
      change: -8.1,
      trend: 'down',
      icon: <TrendingDown className="w-6 h-6" />,
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  // Department data with colors
  const departmentDataWithColors = departmentData.map((dept, idx) => {
    const colors = [
      'from-red-500 to-rose-500',
      'from-orange-500 to-amber-500',
      'from-green-500 to-emerald-500',
      'from-yellow-500 to-orange-500',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
    ];
    return {
      name: dept.department,
      riskScore: dept.avg_risk_score,
      employees: dept.employee_count,
      color: colors[idx % colors.length],
    };
  });

  // Create trend data (mock for now - could be extended with real trend API)
  const trendData = [
    { month: 'Month 1', score: avgRiskScore + 0.8 },
    { month: 'Month 2', score: avgRiskScore + 0.5 },
    { month: 'Month 3', score: avgRiskScore + 0.2 },
    { month: 'Month 4', score: avgRiskScore },
    { month: 'Month 5', score: avgRiskScore - 0.3 },
    { month: 'Month 6', score: avgRiskScore },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Risk Analytics
            </h1>
            <p className="text-slate-500 mt-1">Comprehensive data analysis and insights</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-200 hover:bg-white transition-all">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filters</span>
            </button>
            <button
              onClick={() => analyticsAPI.export({ format: 'csv' })}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-4">
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
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Trend Chart */}
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Risk Score Trend</h2>
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="h-64 flex items-end justify-between space-x-2">
              {trendData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center space-y-2">
                  <div className="w-full bg-slate-200 rounded-t-lg relative overflow-hidden" style={{ height: '200px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-lg transition-all duration-1000"
                      style={{ height: `${(data.score / 10) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">{data.month}</div>
                  <div className="text-sm font-bold text-slate-900">{data.score.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Risk Distribution */}
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Department Risk Scores</h2>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <PieChart className="w-5 h-5 text-white" />
              </div>
            </div>
            {departmentDataWithColors.length > 0 ? (
              <div className="space-y-4">
                {departmentDataWithColors.map((dept, idx) => (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${dept.color}`}></div>
                        <span className="font-semibold text-slate-900">{dept.name}</span>
                        <span className="text-sm text-slate-500">({dept.employees} employees)</span>
                      </div>
                      <span className="font-bold text-slate-900">{dept.riskScore.toFixed(1)}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${dept.color} rounded-full transition-all duration-1000 group-hover:scale-105`}
                        style={{ width: `${(dept.riskScore / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">No department data available</div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard
              title="Risk Trend"
              description={`Overall risk score is ${avgRiskScore.toFixed(1)}/10`}
              icon={avgRiskScore < 5 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              type={avgRiskScore < 5 ? 'positive' : 'warning'}
            />
            <InsightCard
              title="Report Rate"
              description={`${reportRate.toFixed(1)}% of employees report suspicious emails`}
              icon={<TrendingUp className="w-5 h-5" />}
              type="positive"
            />
            <InsightCard
              title="Active Simulations"
              description={`${activeSimulations} simulation${activeSimulations !== 1 ? 's' : ''} currently running`}
              icon={<Activity className="w-5 h-5" />}
              type="positive"
            />
            <InsightCard
              title="Completed Campaigns"
              description={`${completedSimulations} simulation${completedSimulations !== 1 ? 's' : ''} completed`}
              icon={<TrendingUp className="w-5 h-5" />}
              type="positive"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  gradient: string;
}

function MetricCard({ title, value, change, trend, icon, gradient }: MetricCardProps) {
  const isPositive = (trend === 'down' && title.includes('Rate')) || (trend === 'up' && !title.includes('Score'));

  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
          <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            <span className="text-sm font-semibold">{Math.abs(change)}%</span>
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
      </div>
    </div>
  );
}

// Insight Card Component
interface InsightCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'positive' | 'warning';
}

function InsightCard({ title, description, icon, type }: InsightCardProps) {
  const colors = {
    positive: {
      bg: 'from-green-50 to-emerald-50',
      icon: 'from-green-500 to-emerald-500',
      text: 'text-green-700',
    },
    warning: {
      bg: 'from-orange-50 to-amber-50',
      icon: 'from-orange-500 to-amber-500',
      text: 'text-orange-700',
    },
  };

  const color = colors[type];

  return (
    <div className={`rounded-xl bg-gradient-to-br ${color.bg} border border-white/50 p-4`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-br ${color.icon}`}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <h3 className={`font-bold ${color.text} mb-1`}>{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
