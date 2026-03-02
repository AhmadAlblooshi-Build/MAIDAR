/**
 * Risk Assessments Page
 * Design questionnaires to measure workforce knowledge and sentiment
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { FileText, ChevronRight, Plus, CheckSquare, Search } from 'lucide-react';

export default function RiskAssessmentPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <RiskAssessmentContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function RiskAssessmentContent() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      // TODO: Replace with real API call
      // For now, using mock data matching UX screenshot
      const mockData = [
        {
          id: '1',
          title: 'Remote Security Protocol 2024',
          status: 'In Progress',
          participants: 842,
          avgTime: '0m',
        },
        {
          id: '2',
          title: 'Social Engineering Awareness',
          status: 'In Progress',
          participants: 842,
          avgTime: '3m',
        },
        {
          id: '3',
          title: 'MFA Sentiment Analysis',
          status: 'In Progress',
          participants: 842,
          avgTime: '4m',
        },
        {
          id: '4',
          title: 'Remote Security Protocol 2024',
          status: 'In Progress',
          participants: 842,
          avgTime: '0m',
        },
      ];
      setAssessments(mockData);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const questionTypes = [
    { icon: <CheckSquare className="w-5 h-5 text-teal-600" />, label: 'Multiple Choice', color: 'text-teal-600' },
    { icon: <span className="text-lg font-bold text-slate-600">T</span>, label: 'True/False', color: 'text-slate-600' },
    { icon: <FileText className="w-5 h-5 text-cyan-600" />, label: 'Scenario Based', color: 'text-cyan-600' },
    { icon: <span className="text-lg font-bold text-slate-600">T</span>, label: 'Short Text', color: 'text-slate-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Risk Assessments</h1>
        <p className="text-slate-600 mt-2">
          Design questionnaires to measure workforce knowledge and sentiment.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Side - Assessment List */}
        <div className="col-span-2 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No assessments yet. Create your first one!</p>
            </div>
          ) : (
            assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => router.push(`/surveys/${assessment.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-cyan-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {assessment.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="info" className="bg-teal-50 text-teal-700 border-teal-200">
                          {assessment.status}
                        </Badge>
                        <span className="text-slate-500">{assessment.participants} Participants</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Stats & Arrow */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">{assessment.avgTime} avg</div>
                      <div className="text-sm text-slate-500">Efficiency</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side - Component Palette */}
        <div className="space-y-6">
          {/* New Assessment Button */}
          <Button
            variant="primary"
            onClick={() => router.push('/surveys/new')}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg"
          >
            New Assessment
          </Button>

          {/* Component Palette Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Component Palette</h3>
              <Search className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Drag and drop these question types to build your custom security assessment.
            </p>

            {/* Question Types */}
            <div className="space-y-3 mb-6">
              {questionTypes.map((type, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-all cursor-move group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                      {type.icon}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{type.label}</span>
                  </div>
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                </div>
              ))}
            </div>

            {/* View Sandbox Button */}
            <Button
              variant="primary"
              onClick={() => alert('Sandbox feature coming soon!')}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500"
            >
              View Sandbox
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
