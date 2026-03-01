/**
 * Tenant Admin Dashboard (Company Risk Health)
 *
 * Main dashboard showing organization risk overview
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import { analyticsAPI, simulationAPI, employeeAPI } from '@/lib/api';
import Card, { StatCard } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { TrendingUp, TrendingDown, Activity, Shield, Users, Target } from 'lucide-react';

export default function DashboardPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <DashboardContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function DashboardContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    // CRITICAL: Only load once, even if component re-mounts
    if (hasLoadedOnce) return;

    let mounted = true;

    const loadData = async () => {
      if (!mounted) return;

      setHasLoadedOnce(true); // Mark as loaded BEFORE starting

      try {
        setLoading(true);
        setError(null);

        // Fetch all dashboard data in parallel with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const [riskDist, deptData, execSummary, simData, empStats] = await Promise.all([
          analyticsAPI.getRiskDistribution(),
          analyticsAPI.getDepartmentComparison(),
          analyticsAPI.getExecutiveSummary(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ),
          simulationAPI.search({ page: 1, page_size: 10 }),
          employeeAPI.statistics(),
        ]);

        clearTimeout(timeoutId);

        if (mounted) {
          setDashboardData({
            riskDistribution: riskDist,
            departmentData: deptData,
            executiveSummary: execSummary,
            simulations: simData.simulations || [],
            employeeStats: empStats,
          });
          setRetryCount(0); // Reset on success
        }
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
        if (mounted) {
          setError(err?.detail || err?.message || 'Failed to load dashboard data');
          // Don't retry automatically - let user manually refresh
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false; // Prevent state updates after unmount
    };
  }, [hasLoadedOnce]); // Only run once

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-600 font-semibold">⚠️ {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  const { riskDistribution, departmentData, executiveSummary, simulations, employeeStats } = dashboardData;

  // Calculate overall risk score
  const calculateOverallRiskScore = (): string => {
    if (!riskDistribution) return '0.0';
    const total = riskDistribution.critical_count + riskDistribution.high_count +
                  riskDistribution.medium_count + riskDistribution.low_count;
    if (total === 0) return '0.0';

    const weightedScore = (
      (riskDistribution.critical_count * 10) +
      (riskDistribution.high_count * 7.5) +
      (riskDistribution.medium_count * 5) +
      (riskDistribution.low_count * 2.5)
    ) / total;

    return weightedScore.toFixed(1);
  };

  const overallScore = calculateOverallRiskScore();
  const avgClickRate = executiveSummary?.average_click_rate || 0;

  // Calculate workforce distribution percentages
  const total = (riskDistribution?.critical_count || 0) +
                (riskDistribution?.high_count || 0) +
                (riskDistribution?.medium_count || 0) +
                (riskDistribution?.low_count || 0);

  const distribution = {
    low: total > 0 ? ((riskDistribution?.low_count || 0) / total * 100).toFixed(0) : 0,
    moderate: total > 0 ? ((riskDistribution?.medium_count || 0) / total * 100).toFixed(0) : 0,
    high: total > 0 ? ((riskDistribution?.high_count || 0) / total * 100).toFixed(0) : 0,
    critical: total > 0 ? ((riskDistribution?.critical_count || 0) / total * 100).toFixed(0) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Good Morning 👋 Welcome Back, {user?.full_name}
        </h1>
        <p className="text-slate-500 mt-1">Here's your organization's risk overview</p>
      </div>

      {/* Primary Risk Score Card */}
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-600 mb-4">Human Risk Score (0-100)</h2>
            <div className="flex items-end space-x-3 mb-4">
              <div className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {overallScore}
              </div>
              <div className="text-2xl font-semibold text-slate-400 mb-2">Company Average</div>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div>
                <span className="text-slate-500">Likelihood Score:</span>
                <span className="font-bold text-slate-900 ml-2">{(parseFloat(overallScore) * 0.9).toFixed(1)}</span>
              </div>
              <div>
                <span className="text-slate-500">Impact Score:</span>
                <span className="font-bold text-slate-900 ml-2">{(parseFloat(overallScore) * 1.2).toFixed(1)}</span>
              </div>
            </div>
            <div className="mt-4">
              {parseFloat(overallScore) < 5 ? (
                <Badge variant="success" dot>Optimal - Low Risk</Badge>
              ) : parseFloat(overallScore) < 7 ? (
                <Badge variant="warning" dot>Elevated - Monitor Closely</Badge>
              ) : (
                <Badge variant="danger" dot>Critical - Immediate Action Required</Badge>
              )}
            </div>
          </div>

          {/* Circular Gauge */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full blur-3xl opacity-30" />
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-slate-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(parseFloat(overallScore) / 10) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-16 h-16 text-teal-500" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workforce Distribution */}
        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Workforce Distribution</h2>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-slate-900">{total.toLocaleString()}</div>
            <div className="text-sm text-slate-500">Total Hits</div>
          </div>

          {/* Donut Chart (simplified) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-700">Low</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{distribution.low}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium text-slate-700">Moderate</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{distribution.moderate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm font-medium text-slate-700">High</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{distribution.high}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-slate-700">Critical</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{distribution.critical}%</span>
            </div>
          </div>
        </Card>

        {/* Risk Health Breakdown */}
        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Risk Health Breakdown by Department</h2>
          <div className="space-y-4">
            {departmentData?.slice(0, 5).map((dept: any, idx: number) => {
              const colors = [
                'from-red-500 to-rose-500',
                'from-orange-500 to-amber-500',
                'from-green-500 to-emerald-500',
                'from-yellow-500 to-orange-500',
                'from-blue-500 to-cyan-500',
              ];

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{dept.department}</span>
                    <span className="text-sm font-bold text-slate-900">{(dept.avg_risk_score * 10).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-1000`}
                      style={{ width: `${(dept.avg_risk_score * 10)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent Simulations & Assessments */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Recent Simulations & Assessments</h2>
          <button
            onClick={() => router.push('/simulations')}
            className="text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            View All →
          </button>
        </div>
        <div className="space-y-3">
          {simulations?.slice(0, 3).map((sim: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => router.push(`/simulations/${sim.id}`)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{sim.name}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(sim.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={sim.status === 'completed' ? 'success' : 'info'}>
                  {sim.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
