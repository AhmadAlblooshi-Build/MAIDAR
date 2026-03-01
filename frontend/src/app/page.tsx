/**
 * Root Page - Redirects to appropriate dashboard
 *
 * Simple router that redirects based on auth state
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for auth state to hydrate from localStorage
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (isSuperAdmin()) {
      router.replace('/super-admin/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, isSuperAdmin, router]);

  // Show simple loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500 mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load multiple data sources in parallel
      const [empStats, riskDist, execSummary] = await Promise.all([
        employeeAPI.statistics(),
        analyticsAPI.getRiskDistribution(),
        analyticsAPI.getExecutiveSummary(),
      ]);

      setStats(empStats);
      setRiskDistribution(riskDist);
      setExecutiveSummary(execSummary);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
            <p className="mt-6 text-slate-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Company Risk Health
            </h1>
            <p className="text-slate-500 mt-1">Real-time security posture overview</p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-emerald-700">Live Monitoring</span>
          </div>
        </div>

        {/* Executive Summary Cards */}
        {executiveSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Employees"
              value={executiveSummary.total_employees}
              icon={<Users className="w-6 h-6" />}
              trend={null}
              color="blue"
            />
            <MetricCard
              title="Average Risk Score"
              value={executiveSummary.average_risk_score}
              icon={<Shield className="w-6 h-6" />}
              trend={-5.2}
              color="teal"
            />
            <MetricCard
              title="Simulations Run"
              value={executiveSummary.total_simulations}
              icon={<Activity className="w-6 h-6" />}
              trend={12.5}
              color="purple"
            />
            <MetricCard
              title="Avg Click Rate"
              value={`${executiveSummary.average_click_rate.toFixed(1)}%`}
              icon={<Target className="w-6 h-6" />}
              trend={-3.8}
              color="rose"
            />
          </div>
        )}

        {/* Risk Distribution */}
        {riskDistribution && (
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Risk Distribution</h2>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                <span>Updated just now</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <RiskCard
                title="Critical Risk"
                count={riskDistribution.critical_count}
                percentage={riskDistribution.critical_percentage}
                color="red"
                icon={<AlertTriangle className="w-5 h-5" />}
              />
              <RiskCard
                title="High Risk"
                count={riskDistribution.high_count}
                percentage={riskDistribution.high_percentage}
                color="orange"
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <RiskCard
                title="Medium Risk"
                count={riskDistribution.medium_count}
                percentage={riskDistribution.medium_percentage}
                color="yellow"
                icon={<Activity className="w-5 h-5" />}
              />
              <RiskCard
                title="Low Risk"
                count={riskDistribution.low_count}
                percentage={riskDistribution.low_percentage}
                color="green"
                icon={<Shield className="w-5 h-5" />}
              />
            </div>
          </div>
        )}

        {/* Key Findings & Actions */}
        {executiveSummary && (executiveSummary.key_findings || executiveSummary.immediate_actions) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Findings */}
            {executiveSummary.key_findings && (
              <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Key Findings</h2>
                </div>
                <ul className="space-y-3">
                  {executiveSummary.key_findings.map((finding: string, idx: number) => (
                    <li key={idx} className="flex items-start group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mr-3 mt-0.5 group-hover:scale-110 transition-transform">
                        <span className="text-xs font-bold text-blue-600">{idx + 1}</span>
                      </div>
                      <span className="text-sm text-slate-700 leading-relaxed">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Immediate Actions */}
            {executiveSummary.immediate_actions && executiveSummary.immediate_actions.length > 0 && (
              <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Immediate Actions</h2>
                </div>
                <ul className="space-y-3">
                  {executiveSummary.immediate_actions.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-start group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center mr-3 mt-0.5 group-hover:scale-110 transition-transform">
                        <span className="text-orange-600 font-bold text-sm">→</span>
                      </div>
                      <span className="text-sm text-slate-700 leading-relaxed">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              title="Manage Employees"
              description="View and manage employee data"
              icon={<Users className="w-8 h-8" />}
              onClick={() => router.push('/employees')}
              gradient="from-blue-500 to-cyan-500"
            />
            <ActionCard
              title="Run Simulation"
              description="Launch a phishing simulation"
              icon={<Activity className="w-8 h-8" />}
              onClick={() => router.push('/simulations')}
              gradient="from-purple-500 to-pink-500"
            />
            <ActionCard
              title="View Analytics"
              description="Analyze risk trends"
              icon={<TrendingUp className="w-8 h-8" />}
              onClick={() => router.push('/analytics')}
              gradient="from-orange-500 to-red-500"
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
  value: string | number;
  icon: React.ReactNode;
  trend: number | null;
  color: 'blue' | 'teal' | 'purple' | 'rose';
}

function MetricCard({ title, value, icon, trend, color }: MetricCardProps) {
  const gradients = {
    blue: 'from-blue-500 to-cyan-500',
    teal: 'from-teal-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    rose: 'from-rose-500 to-orange-500',
  };

  const glows = {
    blue: 'shadow-blue-500/20',
    teal: 'shadow-teal-500/20',
    purple: 'shadow-purple-500/20',
    rose: 'shadow-rose-500/20',
  };

  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[color]} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`}></div>
      <div className={`relative backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl ${glows[color]} p-6 hover:scale-105 transition-transform`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradients[color]} shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
          {trend !== null && (
            <div className={`flex items-center space-x-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-semibold">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
      </div>
    </div>
  );
}

// Risk Card Component
interface RiskCardProps {
  title: string;
  count: number;
  percentage: number;
  color: 'red' | 'orange' | 'yellow' | 'green';
  icon: React.ReactNode;
}

function RiskCard({ title, count, percentage, color, icon }: RiskCardProps) {
  const styles = {
    red: {
      gradient: 'from-red-500 to-rose-500',
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
    },
    orange: {
      gradient: 'from-orange-500 to-amber-500',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
    },
    yellow: {
      gradient: 'from-yellow-500 to-orange-500',
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'border-yellow-200',
    },
    green: {
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
    },
  };

  const style = styles[color];

  return (
    <div className={`${style.bg} rounded-xl border-2 ${style.border} p-4 hover:scale-105 transition-all group`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-semibold ${style.text}`}>{title}</span>
        <div className={`${style.text} group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{count}</div>
      <div className={`text-sm ${style.text} font-medium`}>{percentage.toFixed(1)}% of total</div>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  gradient: string;
}

function ActionCard({ title, description, icon, onClick, gradient }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden backdrop-blur-xl bg-white/60 rounded-xl border border-white/20 shadow-lg p-6 text-left hover:scale-105 transition-all"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
      <div className="relative">
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </button>
  );
}
