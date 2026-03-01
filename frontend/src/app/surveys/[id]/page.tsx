/**
 * Survey Results & Insights Page
 * View survey responses, scoring, and analytics
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card, { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { FileText, Users, CheckCircle, XCircle, TrendingUp, Download, ArrowLeft } from 'lucide-react';

export default function SurveyResultsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <SurveyResultsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function SurveyResultsContent() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      loadSurveyData();
    }
  }, [params.id]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Mock survey data for now (backend API not implemented yet)
      setSurvey({
        id: params.id,
        title: 'Q1 2026 Security Awareness Assessment',
        description: 'Quarterly assessment of employee security knowledge',
        created_at: '2026-02-15',
        status: 'completed',
        total_questions: 10,
        total_responses: 85,
        completion_rate: 85,
        avg_score: 72.4
      });

      // Mock response data
      setResponses([
        {
          id: '1',
          employee_name: 'John Doe',
          employee_email: 'john@company.com',
          department: 'Engineering',
          score: 80,
          correct_answers: 8,
          total_questions: 10,
          completed_at: '2026-02-20T10:30:00Z'
        },
        {
          id: '2',
          employee_name: 'Jane Smith',
          employee_email: 'jane@company.com',
          department: 'Sales',
          score: 60,
          correct_answers: 6,
          total_questions: 10,
          completed_at: '2026-02-20T11:15:00Z'
        },
        {
          id: '3',
          employee_name: 'Bob Johnson',
          employee_email: 'bob@company.com',
          department: 'Marketing',
          score: 90,
          correct_answers: 9,
          total_questions: 10,
          completed_at: '2026-02-20T14:45:00Z'
        },
      ]);
    } catch (error) {
      console.error('Failed to load survey data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'success' as const, label: 'Excellent' };
    if (score >= 60) return { variant: 'warning' as const, label: 'Good' };
    return { variant: 'danger' as const, label: 'Needs Improvement' };
  };

  const handleExport = () => {
    alert('Export functionality coming soon - will download CSV with all responses');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Survey Not Found</h3>
        <p className="text-slate-600 mb-6">This survey doesn't exist or has been deleted</p>
        <Button onClick={() => router.push('/surveys')}>
          Back to Surveys
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/surveys')}
          className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Surveys</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {survey.title}
            </h1>
            <p className="text-slate-500 mt-1">{survey.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={survey.status === 'completed' ? 'success' : 'warning'}>
              {survey.status === 'completed' ? 'Completed' : 'In Progress'}
            </Badge>
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Export Results
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Responses"
          value={survey.total_responses.toString()}
          change={12.5}
          trend="up"
          icon={<Users className="w-6 h-6" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Completion Rate"
          value={`${survey.completion_rate}%`}
          change={5.2}
          trend="up"
          icon={<CheckCircle className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Average Score"
          value={`${survey.avg_score}%`}
          change={-2.3}
          trend="down"
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          title="Questions"
          value={survey.total_questions.toString()}
          change={0}
          trend="neutral"
          icon={<FileText className="w-6 h-6" />}
          gradient="from-orange-500 to-red-500"
        />
      </div>

      {/* Scoring Distribution */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Score Distribution</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm font-medium text-slate-700">Excellent (80-100%)</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden w-48">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }} />
              </div>
              <span className="text-sm font-bold text-slate-900 w-12 text-right">45%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm font-medium text-slate-700">Good (60-79%)</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden w-48">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '35%' }} />
              </div>
              <span className="text-sm font-bold text-slate-900 w-12 text-right">35%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm font-medium text-slate-700">Needs Improvement (&lt;60%)</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden w-48">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '20%' }} />
              </div>
              <span className="text-sm font-bold text-slate-900 w-12 text-right">20%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Individual Responses */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Individual Responses</h2>
          <span className="text-sm text-slate-500">{responses.length} responses</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Correct Answers</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Performance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Completed</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => {
                const badge = getScoreBadge(response.score);
                return (
                  <tr key={response.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-semibold text-slate-900">{response.employee_name}</div>
                        <div className="text-sm text-slate-500">{response.employee_email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-700">{response.department}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden w-20">
                          <div
                            className={`h-full rounded-full ${
                              response.score >= 80 ? 'bg-green-500' :
                              response.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${response.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-900 min-w-[40px]">
                          {response.score}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-700">
                        {response.correct_answers}/{response.total_questions}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-500">
                        {new Date(response.completed_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights & Recommendations */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Insights & Recommendations</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Overall performance is above target (72.4% vs 70% goal)</span>
              </li>
              <li className="flex items-start space-x-2">
                <XCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>20% of respondents scored below 60% - consider targeted training</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Completion rate (85%) is excellent - good employee engagement</span>
              </li>
              <li className="flex items-start space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Risk scores will be automatically updated based on these results</span>
              </li>
            </ul>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/campaigns/new')}
              >
                Create Targeted Training Campaign
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
