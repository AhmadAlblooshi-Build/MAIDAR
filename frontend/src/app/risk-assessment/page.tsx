/**
 * Risk Assessment Page
 * Design questionnaires to measure workforce knowledge and sentiment
 */

'use client';

import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileText, Plus } from 'lucide-react';

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

  // No assessments created yet - show empty state
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

      <Card>
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Assessments Yet</h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Create your first risk assessment to measure employee security awareness and identify training needs.
          </p>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push('/risk-assessment/new')}
          >
            Create Your First Assessment
          </Button>
        </div>
      </Card>
    </div>
  );
}
