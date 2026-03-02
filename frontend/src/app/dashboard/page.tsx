/**
 * Tenant Admin Dashboard (Company Risk Health)
 * Real-time risk analytics and organizational overview
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { TrendingUp, TrendingDown, Activity, Shield, Users, Target, AlertTriangle, ArrowRight } from 'lucide-react';

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
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Fetch real data from API
      const [riskDistRes, execSummaryRes, simulationsRes, highRiskEmployeesRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/analytics/risk-distribution`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/analytics/executive-summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/simulations/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page: 1, page_size: 5 })
        }),
        fetch(`${apiUrl}/api/v1/employees/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            page: 1,
            page_size: 5,
            sort_by: 'risk_score',
            sort_order: 'desc'
          })
        })
      ]);

      const riskDistribution = await riskDistRes.json();
      const executiveSummary = await execSummaryRes.json();
      const simulationsData = await simulationsRes.json();
      const highRiskEmployeesData = await highRiskEmployeesRes.json();

      setDashboardData({
        riskDistribution,
        executiveSummary,
        simulations: simulationsData.items || simulationsData.simulations || [],
        highRiskEmployees: highRiskEmployeesData.employees || []
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { riskDistribution, executiveSummary, simulations, highRiskEmployees } = dashboardData;
  const overallScore = (
    (riskDistribution.critical_count * 10 +
      riskDistribution.high_count * 7.5 +
      riskDistribution.medium_count * 5 +
      riskDistribution.low_count * 2.5) /
    (riskDistribution.critical_count +
      riskDistribution.high_count +
      riskDistribution.medium_count +
      riskDistribution.low_count)
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Company Risk Health
        </h1>
        <p className="text-slate-500 mt-1">Real-time overview of your organization's security posture</p>
      </div>

      {/* Primary Risk Score Card */}
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-600 mb-4">Human Risk Score (0-100)</h2>
            <div className="flex items-end space-x-3 mb-4">
              <div className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {overallScore.toFixed(1)}
              </div>
              <div className="text-2xl font-semibold text-slate-400 mb-2">Company Average</div>
            </div>
            <div className="mt-4">
              <Badge variant="success" dot>
                {overallScore < 3 ? 'Low Risk' : overallScore < 5 ? 'Medium Risk' : overallScore < 7 ? 'High Risk' : 'Critical Risk'}
              </Badge>
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

      {/* High-Risk Employees Widget */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">High-Risk Employees</h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => router.push('/employees?filter=high-risk')}
          >
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {highRiskEmployees && highRiskEmployees.length > 0 ? (
            highRiskEmployees.map((employee: any) => (
              <div
                key={employee.id}
                onClick={() => router.push(`/employees/${employee.id}`)}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {employee.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{employee.full_name}</div>
                    <div className="text-sm text-slate-500">{employee.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{employee.risk_score ? employee.risk_score.toFixed(1) : 'N/A'}</div>
                  <Badge variant="danger">{employee.risk_band || 'High Risk'}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              No high-risk employees found. Great job!
            </div>
          )}
        </div>
      </Card>

      {/* Recent Simulations */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Simulations</h2>
        <div className="space-y-3">
          {simulations.map((sim: any) => (
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
