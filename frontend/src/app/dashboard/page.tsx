/**
 * Tenant Admin Dashboard (Company Risk Health)
 * TEMPORARY: Using mock data to avoid API loop bug
 */

'use client';

import { useEffect, useState } from 'react';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
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
  const [loading, setLoading] = useState(true);

  // Load mock data after short delay
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // MOCK DATA
  const mockData = {
    riskDistribution: {
      critical_count: 12,
      high_count: 45,
      medium_count: 123,
      low_count: 220,
      critical_percentage: 3,
      high_percentage: 11.25,
      medium_percentage: 30.75,
      low_percentage: 55,
    },
    executiveSummary: {
      total_employees: 400,
      average_risk_score: 4.2,
      total_simulations: 24,
      average_click_rate: 18.5,
    },
    departmentData: [
      { department: 'Sales', avg_risk_score: 0.72 },
      { department: 'Engineering', avg_risk_score: 0.34 },
      { department: 'HR', avg_risk_score: 0.58 },
      { department: 'Finance', avg_risk_score: 0.45 },
      { department: 'Marketing', avg_risk_score: 0.62 },
    ],
    simulations: [
      { id: '1', name: 'Q1 Phishing Test', status: 'completed', created_at: '2026-02-15T10:00:00Z' },
      { id: '2', name: 'Executive Training', status: 'active', created_at: '2026-02-28T14:30:00Z' },
      { id: '3', name: 'New Hire Assessment', status: 'completed', created_at: '2026-01-20T09:15:00Z' },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500 mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { riskDistribution, executiveSummary, departmentData, simulations } = mockData;
  const overallScore = (
    (riskDistribution.critical_count * 10 +
      riskDistribution.high_count * 7.5 +
      riskDistribution.medium_count * 5 +
      riskDistribution.low_count * 2.5) /
    (riskDistribution.critical_count +
      riskDistribution.high_count +
      riskDistribution.medium_count +
      riskDistribution.low_count)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm font-medium">
            ⚠️ Using mock data - API integration temporarily disabled for testing
          </p>
        </div>
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
            <div className="mt-4">
              <Badge variant="success" dot>Optimal - Low Risk (Mock Data)</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{executiveSummary.total_employees}</div>
              <div className="text-sm text-slate-500">Total Employees</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{executiveSummary.average_risk_score}</div>
              <div className="text-sm text-slate-500">Avg Risk Score</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{executiveSummary.total_simulations}</div>
              <div className="text-sm text-slate-500">Simulations Run</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{executiveSummary.average_click_rate.toFixed(1)}%</div>
              <div className="text-sm text-slate-500">Avg Click Rate</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Risk Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4">
            <span className="text-sm font-semibold text-red-600">Critical Risk</span>
            <div className="text-3xl font-bold text-slate-900 mt-2">{riskDistribution.critical_count}</div>
            <div className="text-sm text-red-600 font-medium">{riskDistribution.critical_percentage}% of total</div>
          </div>
          <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-4">
            <span className="text-sm font-semibold text-orange-600">High Risk</span>
            <div className="text-3xl font-bold text-slate-900 mt-2">{riskDistribution.high_count}</div>
            <div className="text-sm text-orange-600 font-medium">{riskDistribution.high_percentage}% of total</div>
          </div>
          <div className="bg-yellow-50 rounded-xl border-2 border-yellow-200 p-4">
            <span className="text-sm font-semibold text-yellow-600">Medium Risk</span>
            <div className="text-3xl font-bold text-slate-900 mt-2">{riskDistribution.medium_count}</div>
            <div className="text-sm text-yellow-600 font-medium">{riskDistribution.medium_percentage}% of total</div>
          </div>
          <div className="bg-green-50 rounded-xl border-2 border-green-200 p-4">
            <span className="text-sm font-semibold text-green-600">Low Risk</span>
            <div className="text-3xl font-bold text-slate-900 mt-2">{riskDistribution.low_count}</div>
            <div className="text-sm text-green-600 font-medium">{riskDistribution.low_percentage}% of total</div>
          </div>
        </div>
      </Card>

      {/* Recent Simulations */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Simulations</h2>
        <div className="space-y-3">
          {simulations.map((sim) => (
            <div key={sim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{sim.name}</div>
                  <div className="text-sm text-slate-500">{new Date(sim.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <Badge variant={sim.status === 'completed' ? 'success' : 'info'}>{sim.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
