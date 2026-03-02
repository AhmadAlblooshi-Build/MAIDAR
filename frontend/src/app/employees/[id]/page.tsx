/**
 * Employee Profile Page
 * Workforce Risk Directory - Individual employee risk profile
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { employeeAPI } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import {
  UserIcon,
  ArrowLeft,
  AlertCircle,
  Clock,
  FileText,
  CheckCircle,
  Target as TargetIcon,
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
      const data = await employeeAPI.get(params.id as string);
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
          <button
            onClick={() => router.push('/employees')}
            className="px-6 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  // Calculate risk score (0-100 scale for display)
  const riskScore = employee.risk_score ? Math.round(employee.risk_score * 10) : 0;
  const riskScoreOutOf10 = employee.risk_score || 0;

  const getRiskTier = (score: number) => {
    if (score >= 8) return { label: 'Critical Risk Tier', color: 'bg-red-100 text-red-600', borderColor: 'border-red-300' };
    if (score >= 6) return { label: 'High Risk Tier', color: 'bg-orange-100 text-orange-600', borderColor: 'border-orange-300' };
    if (score >= 4) return { label: 'Medium Risk Tier', color: 'bg-yellow-100 text-yellow-600', borderColor: 'border-yellow-300' };
    return { label: 'Low Risk Tier', color: 'bg-green-100 text-green-600', borderColor: 'border-green-300' };
  };

  const riskTier = getRiskTier(riskScoreOutOf10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/employees')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Workforce Risk Directory</span>
          </button>
          <p className="text-sm text-slate-500">Monitor intelligence and manage training for all employees.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
            Assign Assessment
          </button>
          <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:shadow-lg">
            Schedule Targeted Drill
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Employee Info & Risk Gauge */}
        <div className="space-y-6">
          {/* Employee Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            {/* Avatar Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-4">
              <UserIcon className="w-8 h-8 text-white" />
            </div>

            {/* Name & Title */}
            <h2 className="text-xl font-bold text-slate-900 mb-1">{employee.full_name}</h2>
            <p className="text-sm text-slate-500 mb-4">{employee.job_title || 'No title'}</p>

            {/* Badges */}
            <div className="flex gap-2 mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {employee.department}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                {employee.seniority || 'N/A'}
              </span>
            </div>

            {/* Risk Gauge */}
            <div className="flex flex-col items-center py-8">
              <div className="relative w-48 h-48">
                {/* SVG Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                    strokeDasharray="188.4 62.8"
                  />
                  {/* Foreground arc (75% = 188.4 units) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="8"
                    strokeDasharray={`${(riskScore / 100) * 188.4} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-slate-900">{riskScore}</div>
                  <div className="text-sm text-slate-500 font-medium">Human Risk</div>
                </div>
              </div>

              {/* Risk Tier Badge */}
              <div className={`mt-6 px-4 py-2 rounded-lg text-sm font-medium border ${riskTier.color} ${riskTier.borderColor}`}>
                {riskTier.label}
              </div>
            </div>

            {/* Why is the score high? */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Why is the score high?</h3>
              <div className="space-y-4">
                {/* Risk Factors */}
                <RiskFactor
                  title="Technical Literacy"
                  description={`Literacy level: ${employee.technical_literacy || 'N/A'}/10`}
                  severity={employee.technical_literacy < 5 ? 'Critical' : employee.technical_literacy < 7 ? 'Warning' : 'Nominal'}
                  timeAgo="Current assessment"
                />
                <RiskFactor
                  title="Seniority Level"
                  description={`${employee.seniority || 'Unknown'} position with elevated access`}
                  severity={employee.seniority === 'Executive' ? 'Critical' : 'Warning'}
                  timeAgo="Position data"
                />
                <RiskFactor
                  title="Department Risk"
                  description={`${employee.department} department profile`}
                  severity={employee.department?.toLowerCase().includes('finance') || employee.department?.toLowerCase().includes('executive') ? 'Critical' : 'Nominal'}
                  timeAgo="Department assessment"
                />
                <RiskFactor
                  title="Age Demographics"
                  description={`Age range: ${employee.age_range ? employee.age_range.replace('_', '-') : 'N/A'}`}
                  severity="Nominal"
                  timeAgo="Demographic data"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Risk Attribution */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 h-[400px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Risk Attribution</h3>
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center text-slate-400">
                <p className="text-sm">Risk attribution chart</p>
                <p className="text-xs mt-2">Radar chart visualization</p>
              </div>
            </div>
          </div>

          {/* Risk History Timeline */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Risk History Timeline</h3>
            <div className="space-y-4">
              <TimelineEvent
                icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                title="Risk Score Calculated"
                description={`Current risk score: ${riskScoreOutOf10.toFixed(1)}/10`}
                points={`${riskScore} pts`}
                pointsColor="text-red-600"
                time="Current"
              />
              <TimelineEvent
                icon={<FileText className="w-4 h-4 text-blue-500" />}
                title="Profile Created"
                description="Employee added to system"
                points="0 pts"
                pointsColor="text-slate-600"
                time={new Date(employee.created_at).toLocaleDateString()}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Risk Change Rate */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 h-[400px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Risk Change Rate</h3>
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center text-slate-400">
                <p className="text-sm">Risk trend over time</p>
                <p className="text-xs mt-2">Area chart visualization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskFactor({
  title,
  description,
  severity,
  timeAgo,
}: {
  title: string;
  description: string;
  severity: 'Critical' | 'Warning' | 'Increasing' | 'Nominal';
  timeAgo: string;
}) {
  const severityColors = {
    Critical: 'text-red-600',
    Warning: 'text-orange-600',
    Increasing: 'text-yellow-600',
    Nominal: 'text-slate-600',
  };

  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-teal-500 mt-2" />
      <div className="flex-1">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
          <span className={`text-xs font-medium ${severityColors[severity]}`}>{severity}</span>
        </div>
        <p className="text-xs text-slate-600">{description}</p>
        <p className="text-xs text-slate-400 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

function TimelineEvent({
  icon,
  title,
  description,
  points,
  pointsColor,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  points: string;
  pointsColor: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-slate-900 text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-semibold ${pointsColor}`}>{points}</div>
        <div className="text-xs text-slate-400">{time}</div>
      </div>
    </div>
  );
}
