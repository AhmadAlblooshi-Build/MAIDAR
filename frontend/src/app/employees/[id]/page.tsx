/**
 * Employee Profile Page
 * Individual employee details with risk explainability breakdown
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  User,
  Mail,
  Briefcase,
  Building,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  FileText,
  Download,
  Send
} from 'lucide-react';

export default function EmployeeProfilePage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <EmployeeProfileContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function EmployeeProfileContent() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      loadEmployeeData();
    }
  }, [params.id]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(`${apiUrl}/api/v1/employees/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load employee data');
      }

      const data = await response.json();
      setEmployee(data);
    } catch (err: any) {
      console.error('Failed to load employee:', err);
      setError(err.message || 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Employee not found'}</p>
          <Button onClick={() => router.push('/employees')}>
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBgColor = (score: number) => {
    if (score >= 8) return 'from-red-500 to-rose-600';
    if (score >= 6) return 'from-orange-500 to-amber-600';
    if (score >= 4) return 'from-yellow-500 to-amber-500';
    return 'from-green-500 to-emerald-600';
  };

  const riskScore = employee.risk_score || 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/employees')}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            ← Back to Employees
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Employee Profile
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              // Export employee report
              alert('Export functionality coming soon');
            }}
          >
            Export Report
          </Button>
          <Button
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            onClick={() => {
              // Create campaign for this employee
              router.push(`/campaigns/new?employee=${employee.id}`);
            }}
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Employee Info & Risk Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Basic Info */}
        <Card className="lg:col-span-2">
          <div className="flex items-start space-x-6">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${getRiskBgColor(riskScore)} flex items-center justify-center text-white font-bold text-3xl shadow-lg`}>
              {employee.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{employee.full_name}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Briefcase className="w-4 h-4" />
                  <span>{employee.job_title || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Building className="w-4 h-4" />
                  <span>{employee.department || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <User className="w-4 h-4" />
                  <span>{employee.seniority || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Score Card */}
        <Card className={`bg-gradient-to-br ${getRiskBgColor(riskScore)} text-white`}>
          <div className="text-center">
            <div className="text-sm font-medium opacity-90 mb-2">Risk Score</div>
            <div className="text-6xl font-bold mb-2">{riskScore.toFixed(1)}</div>
            <Badge variant={riskScore >= 6 ? 'danger' : riskScore >= 4 ? 'warning' : 'success'}>
              {employee.risk_band || (riskScore >= 8 ? 'Critical' : riskScore >= 6 ? 'High' : riskScore >= 4 ? 'Medium' : 'Low')}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Risk Explainability Breakdown */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-100">
            <AlertTriangle className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Risk Explainability</h2>
        </div>
        <p className="text-slate-600 mb-6">
          Factors contributing to this employee's risk score:
        </p>
        <div className="space-y-4">
          <RiskFactorItem
            label="Age Range"
            value={employee.age_range ? employee.age_range.replace('_', '-') : 'N/A'}
            impact={employee.age_range && (employee.age_range === '18_24' || employee.age_range === '25_34') ? 'high' : 'medium'}
            description={employee.age_range && (employee.age_range === '18_24' || employee.age_range === '25_34') ? 'Younger employees tend to have less security awareness' : 'Age within typical risk range'}
          />
          <RiskFactorItem
            label="Seniority Level"
            value={employee.seniority || 'N/A'}
            impact={employee.seniority === 'EXECUTIVE' || employee.seniority === 'SENIOR' || employee.seniority === 'Executive' || employee.seniority === 'Senior' ? 'high' : 'medium'}
            description={employee.seniority === 'EXECUTIVE' || employee.seniority === 'Executive' ? 'Executive positions have access to highly sensitive data' : employee.seniority === 'SENIOR' || employee.seniority === 'Senior' ? 'Senior positions have elevated access privileges' : 'Standard employee access level'}
          />
          <RiskFactorItem
            label="Technical Literacy"
            value={employee.technical_literacy ? `${employee.technical_literacy}/10` : 'N/A'}
            impact={employee.technical_literacy && employee.technical_literacy < 5 ? 'high' : employee.technical_literacy && employee.technical_literacy < 7 ? 'medium' : 'low'}
            description={employee.technical_literacy && employee.technical_literacy < 5 ? 'Low technical literacy increases susceptibility to phishing' : employee.technical_literacy && employee.technical_literacy < 7 ? 'Moderate technical skills' : 'Strong technical skills reduce risk'}
          />
          <RiskFactorItem
            label="Department"
            value={employee.department || 'N/A'}
            impact={employee.department?.toLowerCase().includes('finance') || employee.department?.toLowerCase().includes('hr') || employee.department?.toLowerCase().includes('executive') ? 'high' : 'medium'}
            description={employee.department?.toLowerCase().includes('finance') ? 'Finance departments are high-value targets' : employee.department?.toLowerCase().includes('hr') ? 'HR has access to sensitive employee data' : 'Department risk level moderate'}
          />
          <RiskFactorItem
            label="Job Title"
            value={employee.job_title || 'N/A'}
            impact={employee.job_title?.toLowerCase().includes('manager') || employee.job_title?.toLowerCase().includes('director') || employee.job_title?.toLowerCase().includes('ceo') || employee.job_title?.toLowerCase().includes('cfo') ? 'high' : 'medium'}
            description={employee.job_title?.toLowerCase().includes('ceo') || employee.job_title?.toLowerCase().includes('cfo') ? 'C-level positions are prime targets for spear phishing' : employee.job_title?.toLowerCase().includes('manager') || employee.job_title?.toLowerCase().includes('director') ? 'Leadership positions have access to sensitive data' : 'Standard role risk level'}
          />
        </div>
      </Card>

      {/* Simulation History */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <Target className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Simulation History</h2>
          </div>
        </div>
        <div className="text-center py-8 text-slate-500">
          Simulation history will be displayed here once available
        </div>
      </Card>

      {/* Survey Responses */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Survey Responses</h2>
          </div>
        </div>
        <div className="text-center py-8 text-slate-500">
          Survey responses will be displayed here once available
        </div>
      </Card>
    </div>
  );
}

function RiskFactorItem({
  label,
  value,
  impact,
  description
}: {
  label: string;
  value: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}) {
  const getImpactColor = () => {
    if (impact === 'high') return 'text-red-600';
    if (impact === 'medium') return 'text-yellow-600';
    return 'text-green-600';
  };

  const getImpactIcon = () => {
    if (impact === 'high') return <TrendingUp className="w-4 h-4" />;
    if (impact === 'medium') return <TrendingDown className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-1">
          <span className="font-semibold text-slate-900">{label}</span>
          <span className={`flex items-center space-x-1 text-sm font-medium ${getImpactColor()}`}>
            {getImpactIcon()}
            <span className="capitalize">{impact} Impact</span>
          </span>
        </div>
        <div className="text-sm text-slate-600 mb-1">{value}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </div>
  );
}
