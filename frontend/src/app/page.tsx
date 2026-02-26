/**
 * Main Dashboard Page
 *
 * Executive overview with key metrics and charts
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { analyticsAPI, employeeAPI, simulationAPI } from '@/lib/api';
import {
  BarChart,
  TrendingUp,
  Users,
  Shield,
  AlertTriangle,
  Activity,
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [riskDistribution, setRiskDistribution] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [isAuthenticated]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MAIDAR</h1>
              <p className="text-sm text-gray-500">Human Risk Intelligence Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user?.full_name}</span>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive Summary */}
        {executiveSummary && (
          <div className="mb-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Executive Summary</h2>
            <p className="text-primary-100 mb-4">
              {executiveSummary.tenant_name} • {new Date().toLocaleDateString()}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-3xl font-bold">{executiveSummary.total_employees}</div>
                <div className="text-primary-100 text-sm">Total Employees</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{executiveSummary.average_risk_score}</div>
                <div className="text-primary-100 text-sm">Average Risk Score</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{executiveSummary.total_simulations}</div>
                <div className="text-primary-100 text-sm">Simulations Run</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{executiveSummary.average_click_rate.toFixed(1)}%</div>
                <div className="text-primary-100 text-sm">Avg Click Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Distribution */}
        {riskDistribution && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Critical Risk"
                value={riskDistribution.critical_count}
                percentage={riskDistribution.critical_percentage}
                color="risk-critical"
                icon={<AlertTriangle />}
              />
              <StatCard
                title="High Risk"
                value={riskDistribution.high_count}
                percentage={riskDistribution.high_percentage}
                color="risk-high"
                icon={<TrendingUp />}
              />
              <StatCard
                title="Medium Risk"
                value={riskDistribution.medium_count}
                percentage={riskDistribution.medium_percentage}
                color="risk-medium"
                icon={<Activity />}
              />
              <StatCard
                title="Low Risk"
                value={riskDistribution.low_count}
                percentage={riskDistribution.low_percentage}
                color="risk-low"
                icon={<Shield />}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              title="Manage Employees"
              description="View, import, and manage employee data"
              icon={<Users className="w-8 h-8" />}
              onClick={() => router.push('/employees')}
            />
            <ActionCard
              title="Run Simulation"
              description="Launch a new phishing simulation"
              icon={<Activity className="w-8 h-8" />}
              onClick={() => router.push('/simulations/create')}
            />
            <ActionCard
              title="View Analytics"
              description="Analyze risk trends and metrics"
              icon={<BarChart className="w-8 h-8" />}
              onClick={() => router.push('/analytics')}
            />
          </div>
        </div>

        {/* Key Findings */}
        {executiveSummary && executiveSummary.key_findings && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Key Findings</h2>
            <ul className="space-y-2">
              {executiveSummary.key_findings.map((finding: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  <span className="text-gray-700">{finding}</span>
                </li>
              ))}
            </ul>

            {executiveSummary.immediate_actions && executiveSummary.immediate_actions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Immediate Actions</h3>
                <ul className="space-y-2">
                  {executiveSummary.immediate_actions.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-orange-600 mr-2">→</span>
                      <span className="text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Stat Card Component
type RiskColor = 'risk-critical' | 'risk-high' | 'risk-medium' | 'risk-low';

interface StatCardProps {
  title: string;
  value: number;
  percentage: number;
  color: RiskColor;
  icon: React.ReactNode;
}

function StatCard({ title, value, percentage, color, icon }: StatCardProps) {
  const colorClasses: Record<RiskColor, string> = {
    'risk-critical': 'bg-red-50 text-red-600 border-red-200',
    'risk-high': 'bg-orange-50 text-orange-600 border-orange-200',
    'risk-medium': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'risk-low': 'bg-green-50 text-green-600 border-green-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{percentage.toFixed(1)}% of total</div>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function ActionCard({ title, description, icon, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow border border-gray-200 hover:border-primary-500"
    >
      <div className="text-primary-600 mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
