/**
 * Risk Analytics Page (Reports)
 * Aggregated behavioral results and Human Risk performance insights
 */

'use client';

import { useEffect, useState } from 'react';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { TrendingUp, Target, Shield, FileDown, Info } from 'lucide-react';

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
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [riskDistribution, setRiskDistribution] = useState<any>(null);
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [simulationStats, setSimulationStats] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

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

      // Fetch all employees to calculate department statistics
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

        // Calculate department vulnerability statistics
        const deptMap = new Map<string, { count: number; totalRisk: number }>();

        employees.forEach((emp: any) => {
          if (!emp.department) return;

          const dept = deptMap.get(emp.department) || { count: 0, totalRisk: 0 };
          dept.count++;
          dept.totalRisk += emp.risk_score || 0;
          deptMap.set(emp.department, dept);
        });

        const stats = Array.from(deptMap.entries()).map(([department, data]) => {
          const avgRisk = data.count > 0 ? (data.totalRisk / data.count) * 10 : 0;

          return {
            department,
            avgRisk: Math.round(avgRisk)
          };
        }).sort((a, b) => b.avgRisk - a.avgRisk);

        setDepartmentStats(stats);
      }

      // Fetch simulation statistics for incidents
      const simRes = await fetch(`${apiUrl}/api/v1/simulations/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: 1, page_size: 100 })
      });

      if (simRes.ok) {
        const simData = await simRes.json();
        const simulations = simData.simulations || [];

        // Calculate incident and compliance stats
        const totalTargets = simulations.reduce((sum: number, sim: any) => sum + (sim.total_targets || 0), 0);
        const totalClicked = simulations.reduce((sum: number, sim: any) => sum + (sim.clicked_count || 0), 0);
        const totalReported = simulations.reduce((sum: number, sim: any) => sum + (sim.reported_count || 0), 0);

        const incidents = totalTargets > 0 ? ((totalClicked / totalTargets) * 100).toFixed(2) : '0.00';
        const compliance = totalTargets > 0 ? ((totalReported / totalTargets) * 100).toFixed(2) : '0.00';

        setSimulationStats({ incidents, compliance, simulations });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    alert('Export PDF functionality coming soon');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // Calculate metrics
  const totalEmployees = riskDistribution?.total_employees || 0;
  const dataCoverage = totalEmployees > 0 ? 100 : 0; // 100% coverage if we have employees
  const readinessScore = riskDistribution?.mean_risk_score
    ? Math.round(100 - riskDistribution.mean_risk_score)
    : 0;

  // Calculate risk change from mean risk score
  const currentRisk = riskDistribution?.mean_risk_score || 0;
  const riskChange = (currentRisk / 10).toFixed(1);

  const getDepartmentBarColor = (avgRisk: number) => {
    if (avgRisk >= 70) return 'bg-red-500';
    if (avgRisk >= 50) return 'bg-orange-400';
    if (avgRisk >= 30) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600 mt-1">
            Aggregated behavioral results and Human Risk performance insights.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<FileDown className="w-4 h-4" />}
          onClick={handleExportPDF}
          className="bg-teal-500 hover:bg-teal-600"
        >
          Export PDF
        </Button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Change Rate */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {riskChange} pts
              </div>
              <div className="text-slate-600">Current Risk Level</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>

        {/* Data Coverage */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {dataCoverage}%
              </div>
              <div className="text-slate-600">Data Coverage</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>

        {/* Readiness Score */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {readinessScore}/100
              </div>
              <div className="text-slate-600">Readiness Score</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training vs. Risk Incidents */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Training vs. Risk Incidents</h2>
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Info className="w-4 h-4" />
                </button>
                {showTooltip && (
                  <div className="absolute left-0 top-6 w-80 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-10 text-xs text-slate-600">
                    This chart compares employee training completion levels with reported risk incidents over time to identify how training impacts risk reduction and compliance performance.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-3xl font-bold text-teal-500">
                {simulationStats?.incidents || '0.00'}
              </div>
              <div className="text-sm text-slate-600">Incidents</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500">
                {simulationStats?.compliance || '0.00'}
              </div>
              <div className="text-sm text-slate-600">Compliance</div>
            </div>
          </div>

          {/* Visual representation using real simulation data */}
          <div className="h-48 flex items-end justify-between gap-2">
            {simulationStats?.simulations && simulationStats.simulations.length > 0 ? (
              simulationStats.simulations.slice(0, 15).map((sim: any, idx: number) => {
                const incidentRate = sim.total_targets > 0 ? (sim.clicked_count / sim.total_targets) * 100 : 0;
                const complianceRate = sim.total_targets > 0 ? (sim.reported_count / sim.total_targets) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-full bg-teal-400"
                      style={{ height: `${Math.max(incidentRate, 10)}%` }}
                    />
                    <div
                      className="w-full rounded-full bg-orange-400"
                      style={{ height: `${Math.max(complianceRate, 10)}%` }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="w-full flex items-center justify-center text-slate-400 text-sm">
                No simulation data available
              </div>
            )}
          </div>
        </Card>

        {/* Vulnerability by Department */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Vulnerability by Department</h2>

          <div className="space-y-4">
            {departmentStats.slice(0, 5).map((dept, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{dept.department}</span>
                  <span className="text-sm font-bold text-slate-900">
                    {dept.avgRisk}%
                  </span>
                </div>
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getDepartmentBarColor(dept.avgRisk)}`}
                    style={{ width: `${Math.min(dept.avgRisk, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {departmentStats.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No department data available</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
