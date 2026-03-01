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
      const riskDistRes = await fetch(`${apiUrl}/api/v1/risk/distribution`, {
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

      // Mock risk trends data
      setRiskTrends([
        { period: 'Week 1', avgRisk: 5.8, highRiskCount: 28 },
        { period: 'Week 2', avgRisk: 5.6, highRiskCount: 26 },
        { period: 'Week 3', avgRisk: 5.4, highRiskCount: 24 },
        { period: 'Week 4', avgRisk: 5.2, highRiskCount: 22 },
      ]);
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
            <StatCard
              title="Low Risk"
              value={riskDistribution?.low || '0'}
              change={-2.3}
              trend="down"
              icon={<Users className="w-6 h-6" />}
              gradient="from-green-500 to-emerald-500"
            />
            <StatCard
              title="Medium Risk"
              value={riskDistribution?.medium || '0'}
              change={1.2}
              trend="up"
              icon={<Users className="w-6 h-6" />}
              gradient="from-yellow-500 to-orange-500"
            />
            <StatCard
              title="High Risk"
              value={riskDistribution?.high || '0'}
              change={-5.8}
              trend="down"
              icon={<AlertTriangle className="w-6 h-6" />}
              gradient="from-orange-500 to-red-500"
            />
            <StatCard
              title="Critical Risk"
              value={riskDistribution?.critical || '0'}
              change={-12.4}
              trend="down"
              icon={<AlertTriangle className="w-6 h-6" />}
              gradient="from-red-500 to-rose-500"
            />
          </div>

          {/* Risk Trends Over Time */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Risk Trends Over Time</h2>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <TrendingUp className="w-4 h-4" />
                <span>Last 30 Days</span>
              </div>
            </div>
            <div className="space-y-4">
              {riskTrends.map((trend, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{trend.period}</div>
                    <div className="text-sm text-slate-500">Average Risk Score: {trend.avgRisk}</div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm text-slate-500">High Risk Count</div>
                      <div className="text-lg font-bold text-orange-600">{trend.highRiskCount}</div>
                    </div>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden w-32">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${(trend.avgRisk / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
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

          {/* Explainability Views */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Risk Explainability Factors</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                <div className="text-sm font-semibold text-blue-900 mb-2">Age Factor</div>
                <div className="text-2xl font-bold text-blue-600 mb-1">28%</div>
                <div className="text-xs text-blue-700">Younger employees show higher risk</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <div className="text-sm font-semibold text-purple-900 mb-2">Position Level</div>
                <div className="text-2xl font-bold text-purple-600 mb-1">22%</div>
                <div className="text-xs text-purple-700">Entry-level roles at higher risk</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                <div className="text-sm font-semibold text-orange-900 mb-2">Training History</div>
                <div className="text-2xl font-bold text-orange-600 mb-1">35%</div>
                <div className="text-xs text-orange-700">Limited training correlates with risk</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="text-sm font-semibold text-green-900 mb-2">Department Risk</div>
                <div className="text-2xl font-bold text-green-600 mb-1">18%</div>
                <div className="text-xs text-green-700">Sales & Marketing higher exposure</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
                <div className="text-sm font-semibold text-yellow-900 mb-2">Simulation Results</div>
                <div className="text-2xl font-bold text-yellow-600 mb-1">45%</div>
                <div className="text-xs text-yellow-700">Past performance is strongest indicator</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200">
                <div className="text-sm font-semibold text-teal-900 mb-2">Technical Literacy</div>
                <div className="text-2xl font-bold text-teal-600 mb-1">32%</div>
                <div className="text-xs text-teal-700">Lower tech skills increase vulnerability</div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
