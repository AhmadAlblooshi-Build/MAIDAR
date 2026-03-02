/**
 * Assessment Detail Page - Mission Telemetry View
 * Displays real-time results and analytics for deployed assessments
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Spinner from '@/components/ui/Spinner';
import assessmentAPI from '@/lib/api/assessment';
import employeeAPI from '@/lib/api/employee';
import { ArrowLeft, FileText, AlertCircle, Download } from 'lucide-react';

export default function AssessmentDetailPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <AssessmentDetailContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function AssessmentDetailContent() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      loadAssessmentData();
    }
  }, [params.id]);

  const loadAssessmentData = async () => {
    try {
      setLoading(true);

      // Fetch assessment details
      const assessmentData = await assessmentAPI.get(params.id as string);
      setAssessment(assessmentData);

      // Fetch assessment results
      const resultsData = await assessmentAPI.getResults(params.id as string);
      setResults(resultsData.results || []);

      // Fetch all employees to get total pool
      const employeesData = await employeeAPI.search({ page: 1, page_size: 10000 });
      setEmployees(employeesData.employees || []);
    } catch (error) {
      console.error('Failed to load assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Assessment Not Found</h3>
        <p className="text-slate-600 mb-6">This assessment doesn't exist or has been deleted</p>
        <button
          onClick={() => router.push('/surveys')}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
        >
          Back to Assessments
        </button>
      </div>
    );
  }

  // Calculate statistics
  const targetPool = employees.length;
  const activeRespondents = results.filter((r: any) => r.status === 'completed').length;
  const completedCount = results.filter((r: any) => r.status === 'completed').length;
  const inProgressCount = results.filter((r: any) => r.status === 'in_progress').length;
  const totalStarted = results.length;
  const unopenedCount = Math.max(0, targetPool - totalStarted);

  const completedPercentage = targetPool > 0 ? Math.round((completedCount / targetPool) * 100) : 0;
  const inProgressPercentage = targetPool > 0 ? Math.round((inProgressCount / targetPool) * 100) : 0;
  const unopenedPercentage = targetPool > 0 ? Math.round((unopenedCount / targetPool) * 100) : 0;

  // Calculate sentiment index (average score)
  const completedResults = results.filter((r: any) => r.status === 'completed' && r.score !== null);
  const sentimentIndex = completedResults.length > 0
    ? (completedResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / completedResults.length).toFixed(1)
    : '0.0';

  // Calculate phase progression (percentage of target pool that has engaged)
  const phaseProgression = targetPool > 0 ? Math.round((totalStarted / targetPool) * 100) : 0;

  // Calculate department breakdown
  const departmentStats: Record<string, { total: number; completed: number }> = {};
  employees.forEach((emp: any) => {
    const dept = emp.department || 'Unknown';
    if (!departmentStats[dept]) {
      departmentStats[dept] = { total: 0, completed: 0 };
    }
    departmentStats[dept].total++;

    const empResult = results.find((r: any) => r.employee_id === emp.id && r.status === 'completed');
    if (empResult) {
      departmentStats[dept].completed++;
    }
  });

  const departmentCompletion = Object.entries(departmentStats).map(([dept, stats]) => ({
    department: dept,
    percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage);

  const handleExport = () => {
    // TODO: Implement CSV export
    alert('Export functionality - will download assessment results as CSV');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/surveys')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg">Back to Assessments</span>
        </button>

        <button
          onClick={handleExport}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Assessment Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-8 h-8 text-cyan-600" />
          </div>

          {/* Title and Description */}
          <div className="flex-1">
            <div className="text-sm text-slate-500 mb-1">Mission Telemetry</div>
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
              {assessment.status === 'active' && (
                <AlertCircle className="w-5 h-5 text-orange-500" />
              )}
            </div>

            {/* Description Box */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
              <p className="text-sm text-slate-700">
                {assessment.description || 'Results and telemetry from the assessment, tracking workforce engagement and sentiment.'}
              </p>
            </div>

            {/* Main Description */}
            <p className="text-sm text-slate-600">
              Intelligence gathering focused on workforce knowledge and awareness. Currently tracking {targetPool} workforce entities.
            </p>
          </div>
        </div>

        {/* Phase Progression */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Phase Progression</span>
            <span className="text-sm font-bold text-slate-900">{phaseProgression}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${phaseProgression}%` }}
            />
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="text-sm text-slate-600 mb-1">Target Pool</div>
          <div className="text-3xl font-bold text-slate-900">{targetPool.toLocaleString()} Profiles</div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-1">Active Respondents</div>
          <div className="text-3xl font-bold text-slate-900">{activeRespondents}</div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-1">Sentiment Index</div>
          <div className="text-3xl font-bold text-slate-900">{sentimentIndex}%</div>
        </div>
      </div>

      {/* Bottom Grid - Mission Completion & Intelligence Heatmap */}
      <div className="grid grid-cols-2 gap-6">
        {/* Mission Completion - Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Mission Completion</h2>

          <div className="flex items-center justify-center gap-12">
            {/* Donut Chart */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                {/* Completed segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="12"
                  strokeDasharray={`${completedPercentage * 2.51} ${251 - completedPercentage * 2.51}`}
                  strokeLinecap="round"
                />
                {/* In Progress segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="12"
                  strokeDasharray={`${inProgressPercentage * 2.51} ${251 - inProgressPercentage * 2.51}`}
                  strokeDashoffset={-completedPercentage * 2.51}
                  strokeLinecap="round"
                />
                {/* Unopened segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e0f2f1"
                  strokeWidth="12"
                  strokeDasharray={`${unopenedPercentage * 2.51} ${251 - unopenedPercentage * 2.51}`}
                  strokeDashoffset={-(completedPercentage + inProgressPercentage) * 2.51}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-slate-900">{(totalStarted / 1000).toFixed(1)}k</div>
                <div className="text-sm text-slate-500">Total Hits</div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Completed</div>
                  <div className="text-xs text-slate-500">{completedPercentage}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <div>
                  <div className="text-sm font-medium text-slate-700">In Progress</div>
                  <div className="text-xs text-slate-500">{inProgressPercentage}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-100" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Unopened</div>
                  <div className="text-xs text-slate-500">{unopenedPercentage}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Heatmap by Dept */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Intelligence Heatmap by Dept</h2>

          <div className="space-y-4">
            {departmentCompletion.slice(0, 5).map((dept, index) => {
              // Color based on percentage
              let barColor = 'bg-teal-500';
              if (dept.percentage >= 80) barColor = 'bg-red-500';
              else if (dept.percentage >= 60) barColor = 'bg-orange-500';
              else if (dept.percentage >= 40) barColor = 'bg-cyan-500';

              return (
                <div key={dept.department}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{dept.department}</span>
                    <span className="text-sm font-bold text-slate-900">{dept.percentage}%</span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all rounded-full`}
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
