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
import Select from '@/components/ui/Select';
import { TrendingUp, Users, Target, AlertTriangle, Brain, MoreHorizontal } from 'lucide-react';

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
  const [breakdownView, setBreakdownView] = useState('Department');
  const [topEmployeesLimit, setTopEmployeesLimit] = useState('10');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Fetch data in parallel
      const [riskDistRes, employeeStatsRes, employeesRes, simulationsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/analytics/risk-distribution`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/employees/statistics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/employees/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            page: 1,
            page_size: 500
          })
        }),
        fetch(`${apiUrl}/api/v1/simulations/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page: 1, page_size: 5, sort_by: 'created_at', sort_order: 'desc' })
        })
      ]);

      const riskDistribution = await riskDistRes.json();
      const employeeStats = await employeeStatsRes.json();
      const allEmployees = await employeesRes.json();
      const simulations = await simulationsRes.json();

      // Calculate risk breakdowns for different categories
      const employees = allEmployees.employees || [];

      // Helper function to calculate breakdown
      const calculateBreakdown = (field: string) => {
        const breakdownMap = new Map<string, { count: number; totalRisk: number }>();

        employees.forEach((emp: any) => {
          let value = emp[field];
          if (!value) value = 'Unknown';
          if (field === 'languages' && Array.isArray(value)) value = value.join(', ');

          const item = breakdownMap.get(value) || { count: 0, totalRisk: 0 };
          item.count++;
          item.totalRisk += (emp.risk_score || 0);
          breakdownMap.set(value, item);
        });

        return Array.from(breakdownMap.entries())
          .map(([name, data]) => {
            const avgRisk = data.count > 0 ? (data.totalRisk / data.count) : 0;
            const percentage = (avgRisk * 10); // Convert 0-10 scale to 0-100%
            return {
              name: name,
              avgRisk: avgRisk,
              percentage: percentage,
              count: data.count
            };
          })
          .sort((a, b) => b.avgRisk - a.avgRisk);
      };

      const riskBreakdowns = {
        Department: calculateBreakdown('department'),
        Seniority: calculateBreakdown('seniority'),
        'Age group': calculateBreakdown('age_range'),
        Gender: calculateBreakdown('gender'),
        Language: calculateBreakdown('languages')
      };

      // Get all employees sorted by risk score
      const sortedEmployees = employees
        .filter((emp: any) => emp.risk_score !== null && emp.risk_score !== undefined)
        .sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0));

      console.log('Dashboard Data Loaded:', {
        totalEmployees: riskDistribution.total_employees,
        sortedEmployeesCount: sortedEmployees.length,
        breakdownsCount: Object.keys(riskBreakdowns).length,
        simulationsCount: simulations.simulations?.length || 0
      });

      setDashboardData({
        riskDistribution,
        employeeStats,
        riskBreakdowns,
        sortedEmployees,
        simulations: simulations.simulations || []
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskTier = (score: number) => {
    if (score >= 8) return { label: 'Critical', variant: 'danger' as const, color: 'text-red-600' };
    if (score >= 6) return { label: 'High', variant: 'warning' as const, color: 'text-orange-600' };
    if (score >= 4) return { label: 'Moderate', variant: 'warning' as const, color: 'text-yellow-600' };
    return { label: 'Low', variant: 'success' as const, color: 'text-green-600' };
  };

  const getRiskBadge = (score: number) => {
    const avgScore = score / 10 * 100; // Convert 0-10 to 0-100
    if (avgScore >= 70) return { label: 'Elevated', color: 'bg-orange-500 text-white' };
    if (avgScore >= 50) return { label: 'Moderate', color: 'bg-yellow-500 text-white' };
    return { label: 'Healthy', color: 'bg-green-500 text-white' };
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const days = Math.floor(diffInHours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
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

  const { riskDistribution, employeeStats, riskBreakdowns, sortedEmployees = [], simulations } = dashboardData;

  // Calculate overall risk score (0-100 scale)
  const overallRiskScore = riskDistribution.mean_risk_score || 0;
  const riskBadge = getRiskBadge(overallRiskScore / 10);

  // Calculate likelihood and impact scores (simplified)
  const likelihoodScore = Math.round(overallRiskScore * 0.4);
  const impactScore = Math.round(overallRiskScore * 0.52);

  // Get current breakdown based on selected view
  const currentBreakdown = riskBreakdowns[breakdownView] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">Good Morning</p>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome Back, {user?.full_name}
          </h1>
        </div>
        <Button
          variant="primary"
          icon={<Brain className="w-4 h-4" />}
          onClick={() => router.push('/ai-lab')}
        >
          AI Scenario Lab
        </Button>
      </div>

      {/* Top Section: Risk Score, Description, Workforce Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Human Risk Score */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-600">Human Risk Score (0-100)</h3>
            <span className="text-lg">🔍</span>
          </div>
          <div className="flex items-center justify-center mb-6 relative">
            <div className="relative">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(overallRiskScore / 100) * 439.6} 439.6`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${riskBadge.color}`}>
                  {riskBadge.label}
                </span>
              </div>
            </div>
          </div>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-slate-900">{overallRiskScore.toFixed(1)}</div>
            <div className="text-sm text-slate-500">Company Average</div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Likelihood Score</div>
              <div className="text-xl font-bold text-slate-900">{likelihoodScore}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Impact Score</div>
              <div className="text-xl font-bold text-slate-900">{impactScore}</div>
            </div>
          </div>
        </Card>

        {/* Description */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Primary risk index of organization based on:</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Simulation results, risk assessments, and data quality factors</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Employee behavior patterns and vulnerability trends</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Department-level risk exposure and compliance metrics</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Historical incident data and training effectiveness</span>
            </li>
          </ul>
        </Card>

        {/* Workforce Distribution */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-600">Workforce Distribution</h3>
            <span className="text-lg">👥</span>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Low Risk - Green */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeDasharray={`${(riskDistribution.low_percentage / 100) * 251.2} 251.2`}
                />
                {/* Moderate Risk - Yellow */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="20"
                  strokeDasharray={`${(riskDistribution.medium_percentage / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${(riskDistribution.low_percentage / 100) * 251.2}`}
                />
                {/* High Risk - Orange */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="20"
                  strokeDasharray={`${(riskDistribution.high_percentage / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${((riskDistribution.low_percentage + riskDistribution.medium_percentage) / 100) * 251.2}`}
                />
                {/* Critical Risk - Red */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray={`${(riskDistribution.critical_percentage / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${((riskDistribution.low_percentage + riskDistribution.medium_percentage + riskDistribution.high_percentage) / 100) * 251.2}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-slate-900">
                  {riskDistribution.total_employees >= 1000
                    ? (riskDistribution.total_employees / 1000).toFixed(1) + 'k'
                    : riskDistribution.total_employees}
                </div>
                <div className="text-xs text-slate-500">Total Hired</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-600">Low ({riskDistribution.low_percentage}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-600">Moderate ({riskDistribution.medium_percentage}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-slate-600">High ({riskDistribution.high_percentage}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-600">Critical ({riskDistribution.critical_percentage}%)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Section: Risk Health Breakdown & Recent Simulations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Health Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Risk Health Breakdown</h2>
            <Select
              value={breakdownView}
              onChange={(e) => setBreakdownView(e.target.value)}
              options={[
                { value: 'Department', label: 'Department' },
                { value: 'Seniority', label: 'Seniority' },
                { value: 'Age group', label: 'Age group' },
                { value: 'Gender', label: 'Gender' },
                { value: 'Language', label: 'Language' }
              ]}
            />
          </div>
          <div className="space-y-4">
            {currentBreakdown && currentBreakdown.length > 0 ? (
              currentBreakdown.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-700 capitalize">{item.name}</span>
                      <span className="text-xs text-slate-500 ml-2">({item.count} employees)</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{item.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>No {breakdownView.toLowerCase()} data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Simulations & Assessments */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Recent Simulations & Assessments</h2>
          <div className="space-y-4">
            {simulations.length > 0 ? simulations.map((sim: any) => (
              <div key={sim.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => router.push(`/campaigns/${sim.id}`)}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{sim.name}</div>
                    <div className="text-xs text-slate-500">{getTimeAgo(sim.created_at)}</div>
                  </div>
                </div>
                <Badge variant={sim.status === 'completed' ? 'success' : 'info'}>
                  {sim.status}
                </Badge>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-500">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>No simulations yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Section: Highest Risk Employees */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Highest risk employees</h2>
            <p className="text-sm text-slate-500">Immediate intervention queue based on employee behavior.</p>
          </div>
          <div className="w-48 relative z-10">
            <Select
              value={topEmployeesLimit}
              onChange={(e) => {
                console.log('Changing limit from', topEmployeesLimit, 'to', e.target.value);
                setTopEmployeesLimit(e.target.value);
              }}
              options={[
                { value: '10', label: 'Top 10 Employees' },
                { value: '20', label: 'Top 20 Employees' },
                { value: '30', label: 'Top 30 Employees' },
              ]}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Risk Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Risk Tier</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Top Risk Factors</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const displayCount = parseInt(topEmployeesLimit);
                const employeesToShow = sortedEmployees.slice(0, displayCount);
                console.log(`Showing ${employeesToShow.length} employees (limit: ${topEmployeesLimit})`);
                return sortedEmployees.length > 0 ? (
                  employeesToShow.map((emp: any, idx: number) => {
                  const tier = getRiskTier(emp.risk_score);
                  return (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <button
                          onClick={() => router.push(`/employees/${emp.id}`)}
                          className="text-teal-600 hover:text-teal-700 font-medium"
                        >
                          {emp.full_name}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-700">{emp.department}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold text-slate-900">{(emp.risk_score * 10).toFixed(0)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={tier.variant}>{tier.label}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.seniority === 'junior' && (
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">Low Seniority</span>
                          )}
                          {emp.technical_literacy < 5 && (
                            <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">Low Tech Literacy</span>
                          )}
                          {emp.risk_score >= 7 && (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">High Risk Profile</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>No high-risk employees found</p>
                  </td>
                </tr>
              );
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
