/**
 * Risk Assessment Page
 * Design questionnaires to measure workforce knowledge and sentiment
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { FileText, Plus, Users, Clock, Target, CheckCircle } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  const assessments = [
    {
      id: '1',
      title: 'Q4 Security Awareness Assessment',
      status: 'in_progress',
      participants: 847,
      completion: 68,
      created: '2024-01-15',
    },
    {
      id: '2',
      title: 'Remote Work Security Survey',
      status: 'completed',
      participants: 1240,
      completion: 100,
      created: '2024-01-10',
    },
    {
      id: '3',
      title: 'Phishing Awareness Check',
      status: 'draft',
      participants: 0,
      completion: 0,
      created: '2024-01-20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Risk Assessments
          </h1>
          <p className="text-slate-500 mt-1">
            Design questionnaires to measure workforce knowledge and sentiment
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/risk-assessment/new')}
        >
          New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onClick={() => router.push(`/risk-assessment/${assessment.id}`)}
            />
          ))}
        </div>

        <div>
          <Card>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Component Palette</h3>
            <p className="text-sm text-slate-600 mb-4">
              Drag and drop question types to build your assessment
            </p>
            <div className="space-y-3">
              <ComponentItem
                icon={<FileText className="w-5 h-5" />}
                title="Multiple Choice"
                description="Single answer selection"
              />
              <ComponentItem
                icon={<CheckCircle className="w-5 h-5" />}
                title="True/False"
                description="Binary choice questions"
              />
              <ComponentItem
                icon={<Target className="w-5 h-5" />}
                title="Scenario Based"
                description="Context-driven questions"
              />
              <ComponentItem
                icon={<FileText className="w-5 h-5" />}
                title="Short Text"
                description="Free-form responses"
              />
            </div>
            <Button
              variant="secondary"
              className="w-full mt-4"
              onClick={() => router.push('/risk-assessment/new')}
            >
              View Sandbox
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AssessmentCard({ assessment, onClick }: { assessment: any; onClick: () => void }) {
  const getStatusBadge = () => {
    if (assessment.status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (assessment.status === 'in_progress') return <Badge variant="warning">In Progress</Badge>;
    return <Badge variant="neutral">Draft</Badge>;
  };

  return (
    <Card hover onClick={onClick} className="cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{assessment.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge()}
              <span className="text-sm text-slate-500">
                {new Date(assessment.created).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-xs text-slate-500">Participants</div>
            <div className="text-sm font-bold text-slate-900">{assessment.participants}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-xs text-slate-500">Completion</div>
            <div className="text-sm font-bold text-slate-900">{assessment.completion}%</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-xs text-slate-500">Efficiency</div>
            <div className="text-sm font-bold text-slate-900">High</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ComponentItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all cursor-move">
      <div className="flex items-center space-x-3">
        <div className="text-teal-600">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
    </div>
  );
}
