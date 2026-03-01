/**
 * Analytics & Insights Page
 * Risk distribution, trends, explainability, and department analysis
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card, { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { BarChart3, TrendingUp, Users, AlertTriangle, Download } from 'lucide-react';

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
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [riskDistribution, setRiskDistribution] = useState<any>(null);
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [riskTrends, setRiskTrends] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Fetch risk distribution
      const riskDistRes = await fetch(`${apiUrl}/api/v1/analytics/risk-distribution`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (riskDistRes.ok) {
        const riskData = await riskDistRes.json();
        setRiskDistribution(riskData);
      }

      // Fetch department statistics
      const deptRes = await fetch(`${apiUrl}/api/v1/employees/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (deptRes.ok) {
        const deptData = await deptRes.json();

        // Fetch all employees to calculate department-level risk statistics
        const employeesRes = await fetch(`${apiUrl}/api/v1/employees/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: 1, page_size: 1000 })
        });

        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          const employees = employeesData.employees || [];

          // Calculate department statistics from real employee data
          const deptMap = new Map<string, { count: number; totalRisk: number; highRisk: number }>();

          employees.forEach((emp: any) => {
            if (!emp.department) return;

            const dept = deptMap.get(emp.department) || { count: 0, totalRisk: 0, highRisk: 0 };
            dept.count++;
            dept.totalRisk += emp.risk_score || 0;
            if (emp.risk_score >= 6) dept.highRisk++;
            deptMap.set(emp.department, dept);
          });

          const stats = Array.from(deptMap.entries()).map(([department, data]) => ({
            department,
            count: data.count,
            avgRisk: data.count > 0 ? parseFloat((data.totalRisk / data.count).toFixed(2)) : 0,
            highRisk: data.highRisk
          })).sort((a, b) => b.avgRisk - a.avgRisk); // Sort by highest risk first

          setDepartmentStats(stats);
        }
      }

      // Risk trends - use current snapshot (historical trends require time-series data)
      if (riskDistRes.ok) {
        const riskData = await riskDistRes.json();
        setRiskTrends([
          {
            period: 'Current',
            avgRisk: riskData.mean_risk_score / 10, // Convert 0-100 to 0-10 scale
            highRiskCount: riskData.high_count + riskData.critical_count
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 7) return 'text-red-600 bg-red-100';
    if (score >= 5) return 'text-orange-600 bg-orange-100';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Analytics & Insights
          </h1>
          <p className="text-slate-500 mt-1">
            Risk distribution, trends, and department-level analysis
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: '90d', label: 'Last 90 Days' },
              { value: 'ytd', label: 'Year to Date' },
            ]}
          />
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => alert('Export functionality coming soon')}
          >
            Export Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Risk Distribution Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{riskDistribution?.low_count || 0}</div>
                  <div className="text-sm text-slate-500">Low Risk</div>
                  <div className="text-xs text-green-600 font-medium">{riskDistribution?.low_percentage || 0}% of total</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{riskDistribution?.medium_count || 0}</div>
                  <div className="text-sm text-slate-500">Medium Risk</div>
                  <div className="text-xs text-yellow-600 font-medium">{riskDistribution?.medium_percentage || 0}% of total</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{riskDistribution?.high_count || 0}</div>
                  <div className="text-sm text-slate-500">High Risk</div>
                  <div className="text-xs text-orange-600 font-medium">{riskDistribution?.high_percentage || 0}% of total</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-rose-500">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{riskDistribution?.critical_count || 0}</div>
                  <div className="text-sm text-slate-500">Critical Risk</div>
                  <div className="text-xs text-red-600 font-medium">{riskDistribution?.critical_percentage || 0}% of total</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Risk Overview Summary */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Risk Overview Summary</h2>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <BarChart3 className="w-4 h-4" />
                <span>Current Snapshot</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <div className="text-sm font-semibold text-slate-600 mb-2">Total Employees</div>
                <div className="text-4xl font-bold text-slate-900">{riskDistribution?.total_employees || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Active employees in system</div>
              </div>
              <div className="p-6 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                <div className="text-sm font-semibold text-orange-700 mb-2">Average Risk Score</div>
                <div className="text-4xl font-bold text-orange-600">
                  {riskDistribution?.mean_risk_score ? (riskDistribution.mean_risk_score / 10).toFixed(1) : '0.0'}
                </div>
                <div className="text-xs text-orange-600 mt-1">Out of 10.0 scale</div>
              </div>
              <div className="p-6 rounded-lg bg-gradient-to-br from-red-50 to-rose-50 border border-red-200">
                <div className="text-sm font-semibold text-red-700 mb-2">High + Critical Risk</div>
                <div className="text-4xl font-bold text-red-600">
                  {(riskDistribution?.high_count || 0) + (riskDistribution?.critical_count || 0)}
                </div>
                <div className="text-xs text-red-600 mt-1">Require immediate attention</div>
              </div>
            </div>
          </Card>

          {/* Department-Level Analysis */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Department-Level Analysis</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/employees')}
              >
                View All Employees
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employees</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Avg Risk Score</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">High Risk</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentStats.map((dept, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{dept.department}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{dept.count}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden w-20">
                            <div
                              className={`h-full rounded-full transition-all ${
                                dept.avgRisk >= 7 ? 'bg-red-500' :
                                dept.avgRisk >= 5 ? 'bg-orange-500' :
                                dept.avgRisk >= 3 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(dept.avgRisk / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-900 min-w-[35px]">
                            {dept.avgRisk.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-semibold text-orange-600">{dept.highRisk}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadgeColor(dept.avgRisk)}`}>
                          {dept.avgRisk >= 7 ? 'Critical' :
                           dept.avgRisk >= 5 ? 'High' :
                           dept.avgRisk >= 3 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Risk Factors */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Top Departments by Risk</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/employees')}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {departmentStats.slice(0, 5).map((dept, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      idx === 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' :
                      idx === 1 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                      idx === 2 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                      'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{dept.department}</div>
                      <div className="text-sm text-slate-500">{dept.count} employees</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Avg Risk</div>
                      <div className="text-lg font-bold text-orange-600">{dept.avgRisk.toFixed(1)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">High Risk</div>
                      <div className="text-lg font-bold text-red-600">{dept.highRisk}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
