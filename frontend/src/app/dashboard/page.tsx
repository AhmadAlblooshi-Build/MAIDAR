/**
 * Tenant Admin Dashboard (Company Risk Health)
 * Real-time risk analytics and organizational overview
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import { employeeAPI, analyticsAPI, simulationAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { TrendingUp, Users, Target, AlertTriangle, Brain, MoreHorizontal, Eye, ClipboardList, Trash2, Edit, Check, Calendar } from 'lucide-react';

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
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAssignAssessmentModal, setShowAssignAssessmentModal] = useState(false);
  const [employeeToAssign, setEmployeeToAssign] = useState<{ id: string; full_name: string } | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setOpenActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel using API client (will catch 403 suspension errors)
      const [riskDistribution, employeeStats, allEmployees, simulations] = await Promise.all([
        analyticsAPI.getRiskDistribution(),
        employeeAPI.statistics(),
        employeeAPI.search({ page: 1, page_size: 500 }),
        simulationAPI.search({ page: 1, page_size: 5, sort_by: 'created_at', sort_order: 'desc' })
      ]);

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

  const handleViewDetails = (employeeId: string) => {
    setOpenActionsMenu(null);
    router.push(`/employees/${employeeId}`);
  };

  const handleEditEmployee = async (employeeId: string) => {
    setOpenActionsMenu(null);
    try {
      // Fetch employee data and open edit modal (no navigation)
      const employee = await employeeAPI.get(employeeId);
      setSelectedEmployee(employee);
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to load employee:', error);
      alert('Failed to load employee data');
    }
  };

  const handleAssignAssessment = (employeeId: string) => {
    setOpenActionsMenu(null);
    // Find employee from dashboardData
    const employees = dashboardData?.sortedEmployees || [];
    const employee = employees.find((emp: any) => emp.id === employeeId);
    if (employee) {
      setEmployeeToAssign({ id: employee.id, full_name: employee.full_name });
      setShowAssignAssessmentModal(true);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    setOpenActionsMenu(null);

    if (!confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingEmployee(employeeId);

      // Use API client (will catch 403 suspension errors)
      await employeeAPI.delete(employeeId);

      // Reload dashboard data to reflect the deletion
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      alert('Failed to delete employee. Please try again.');
    } finally {
      setDeletingEmployee(null);
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
              onChange={(e) => setTopEmployeesLimit(e.target.value)}
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
              {sortedEmployees.length > 0 ? (
                sortedEmployees.slice(0, parseInt(topEmployeesLimit)).map((emp: any, idx: number) => {
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
                        <div className="relative" ref={openActionsMenu === emp.id ? actionsMenuRef : null}>
                          <button
                            onClick={() => setOpenActionsMenu(openActionsMenu === emp.id ? null : emp.id)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                            disabled={deletingEmployee === emp.id}
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>

                          {/* Actions Dropdown */}
                          {openActionsMenu === emp.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                              <button
                                onClick={() => handleViewDetails(emp.id)}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Details</span>
                              </button>
                              <button
                                onClick={() => handleEditEmployee(emp.id)}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleAssignAssessment(emp.id)}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <ClipboardList className="w-4 h-4" />
                                <span>Assign Assessment</span>
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
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
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={showEditModal}
        employee={selectedEmployee}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEmployee(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedEmployee(null);
          loadDashboardData();
        }}
      />

      {/* Assign Assessment Modal */}
      {employeeToAssign && (
        <AssignAssessmentModal
          isOpen={showAssignAssessmentModal}
          onClose={() => {
            setShowAssignAssessmentModal(false);
            setEmployeeToAssign(null);
          }}
          employee={employeeToAssign}
          onSuccess={() => {
            setShowAssignAssessmentModal(false);
            setEmployeeToAssign(null);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}

// Edit Employee Modal Component
function EditEmployeeModal({
  isOpen,
  employee,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  employee: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    job_title: '',
    role: '',
    gender: '',
    date_of_birth: '',
    language: '',
    technical_literacy: 5,
  });

  // Pre-populate form when employee data is loaded
  useEffect(() => {
    if (employee) {
      // Map seniority back to role
      const seniorityToRole: { [key: string]: string } = {
        'mid': 'Individual',
        'senior': 'Manager',
        'executive': 'Director',
        'c_level': 'C-Level',
        'junior': 'Individual',
      };

      // Map language code back to language name
      const langCodeToName: { [key: string]: string } = {
        'en': 'English',
        'ar': 'Arabic',
      };

      // Calculate approximate date of birth from age_range
      const calculateDOBFromAgeRange = (ageRange: string): string => {
        const currentYear = new Date().getFullYear();
        const midpoints: { [key: string]: number } = {
          '18_24': 21,
          '25_34': 29,
          '35_44': 39,
          '45_54': 49,
          '55_plus': 60,
        };
        const age = midpoints[ageRange] || 29;
        const birthYear = currentYear - age;
        return `${birthYear}-01-01`;
      };

      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        department: employee.department || '',
        job_title: employee.job_title || '',
        role: seniorityToRole[employee.seniority] || 'Individual',
        gender: employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : '',
        date_of_birth: calculateDOBFromAgeRange(employee.age_range),
        language: employee.languages?.[0] ? langCodeToName[employee.languages[0]] || 'English' : 'English',
        technical_literacy: employee.technical_literacy || 5,
      });
    }
  }, [employee]);

  // Calculate age range from date of birth
  const calculateAgeRange = (dob: string): string => {
    if (!dob) return '25_34';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age >= 18 && age <= 24) return '18_24';
    if (age >= 25 && age <= 34) return '25_34';
    if (age >= 35 && age <= 44) return '35_44';
    if (age >= 45 && age <= 54) return '45_54';
    return '55_plus';
  };

  // Map role to seniority
  const mapRoleToSeniority = (role: string): string => {
    const mapping: { [key: string]: string } = {
      'Individual': 'mid',
      'Manager': 'senior',
      'Director': 'senior',
      'C-Level': 'c_level',
    };
    return mapping[role] || 'mid';
  };

  // Map language to language code
  const mapLanguageToCode = (language: string): string => {
    const mapping: { [key: string]: string } = {
      'English': 'en',
      'Arabic': 'ar',
    };
    return mapping[language] || 'en';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setLoading(true);

    try {
      // Prepare data for API
      const apiData: any = {
        full_name: formData.full_name,
        email: formData.email,
        department: formData.department,
        age_range: calculateAgeRange(formData.date_of_birth),
        technical_literacy: formData.technical_literacy,
        seniority: mapRoleToSeniority(formData.role),
        languages: formData.language ? [mapLanguageToCode(formData.language)] : ['en'],
      };

      // Only add optional fields if they have values
      if (formData.job_title && formData.job_title.trim()) {
        apiData.job_title = formData.job_title.trim();
      }
      if (formData.gender && formData.gender.trim()) {
        apiData.gender = formData.gender.toLowerCase();
      }

      await employeeAPI.update(employee.id, apiData);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      const errorMsg = error.detail || error.message || 'Unknown error';
      alert(`Failed to update employee: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee" subtitle="Edit employee info directory">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <Input
          label="Full Name"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Enter full name"
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email address"
        />

        {/* Department */}
        <Select
          label="Department"
          required
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          options={[
            { value: '', label: 'Select department' },
            { value: 'Finance', label: 'Finance' },
            { value: 'Engineering', label: 'Engineering' },
            { value: 'Sales', label: 'Sales' },
            { value: 'Hr', label: 'Hr' },
          ]}
        />

        {/* Job Title (optional) */}
        <Input
          label="Job Title (Optional)"
          value={formData.job_title}
          onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
          placeholder="e.g., Software Engineer"
        />

        {/* Role | Gender (two columns) */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: '', label: 'Select role' },
              { value: 'Director', label: 'Director' },
              { value: 'Manager', label: 'Manager' },
              { value: 'Individual', label: 'Individual' },
              { value: 'C-Level', label: 'C-Level' },
            ]}
          />
          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            options={[
              { value: '', label: 'Select gender' },
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>

        {/* Date of Birth | Language (two columns) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <Select
            label="Language"
            required
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            options={[
              { value: '', label: 'Select language' },
              { value: 'English', label: 'English' },
              { value: 'Arabic', label: 'Arabic' },
            ]}
          />
        </div>

        {/* Technical Literacy */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Technical Literacy (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            required
            value={formData.technical_literacy}
            onChange={(e) => setFormData({ ...formData, technical_literacy: parseInt(e.target.value) || 5 })}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-500 mt-1">1 = Low, 10 = High technical skills</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Update
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Assign Assessment Modal Component
function AssignAssessmentModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    full_name: string;
  };
  onSuccess: () => void;
}) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [riskPriority, setRiskPriority] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAssessments();
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDueDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const loadAssessments = async () => {
    try {
      setLoadingAssessments(true);
      const assessmentAPI = (await import('@/lib/api/assessment')).default;
      const response = await assessmentAPI.list({ page: 1, page_size: 100, status: 'active' });
      setAssessments(response.assessments || []);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const toggleAssessment = (assessmentId: string) => {
    if (selectedAssessments.includes(assessmentId)) {
      setSelectedAssessments(selectedAssessments.filter((id) => id !== assessmentId));
    } else {
      setSelectedAssessments([...selectedAssessments, assessmentId]);
    }
  };

  const handleConfirm = async () => {
    if (selectedAssessments.length === 0) {
      alert('Please select at least one assessment');
      return;
    }
    if (!dueDate) {
      alert('Please select a due date');
      return;
    }

    try {
      setLoading(true);

      // Use employeeAPI instead of raw fetch for proper authentication
      const response = await employeeAPI.assignAssessments(employee.id, {
        assessment_ids: selectedAssessments,
        due_date: dueDate,
        risk_priority: riskPriority,
      });

      alert(`Successfully assigned ${selectedAssessments.length} assessment(s) to ${employee.full_name}`);
      setSelectedAssessments([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to assign assessments:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      alert('Failed to assign assessments: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (assessment: any) => {
    const title = assessment.title?.toLowerCase() || '';
    const category = assessment.category?.toLowerCase() || '';
    if (title.includes('phishing') || category.includes('phishing')) {
      return { label: 'SIMULATIONS', color: 'bg-blue-100 text-blue-700' };
    } else if (title.includes('advanced') || category.includes('advanced') || category.includes('security')) {
      return { label: 'ADVANCED', color: 'bg-purple-100 text-purple-700' };
    } else if (title.includes('password') || title.includes('hygiene')) {
      return { label: 'BEHAVIORAL', color: 'bg-orange-100 text-orange-700' };
    } else if (title.includes('remote') || title.includes('work')) {
      return { label: 'REMOTE', color: 'bg-teal-100 text-teal-700' };
    }
    return { label: 'GENERAL', color: 'bg-slate-100 text-slate-700' };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Assessment" subtitle={`Select multiple assessments for ${employee.full_name}`}>
      <div className="space-y-6">
        <div className="max-h-80 overflow-y-auto">
          {loadingAssessments ? (
            <div className="text-center py-8 text-slate-500">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No active assessments available</p>
              <p className="text-sm mt-1">Create an assessment first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => {
                const isSelected = selectedAssessments.includes(assessment.id);
                const badge = getCategoryBadge(assessment);
                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => toggleAssessment(assessment.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 mb-1">{assessment.title}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                            {assessment.question_count || 0} items
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>{badge.label}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Risk Priority</label>
            <select
              value={riskPriority}
              onChange={(e) => setRiskPriority(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="low">Low Priority</option>
              <option value="standard">Standard Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || selectedAssessments.length === 0}
            loading={loading}
            className="bg-teal-500 hover:bg-teal-600"
          >
            Confirm Deployment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
