/**
 * Risk Assessment Page
 *
 * Analyze and assess organizational risk factors
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { analyticsAPI, employeeAPI } from '@/lib/api';
import Layout from '@/components/Layout';
import { Shield, AlertTriangle, TrendingDown, TrendingUp, Target, FileText, Download } from 'lucide-react';

export default function RiskAssessmentPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [riskDistribution, setRiskDistribution] = useState<any>(null);
  const [departmentData, setDepartmentData] = useState<any>(null);
  const [seniorityData, setSeniorityData] = useState<any>(null);
  const [employeeStats, setEmployeeStats] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadAssessmentData();
  }, [isAuthenticated]);

  const loadAssessmentData = async () => {
    try {
      setLoading(true);
      const [riskDist, deptData, senData, empStats] = await Promise.all([
        analyticsAPI.getRiskDistribution(),
        analyticsAPI.getDepartmentComparison(),
        analyticsAPI.getSeniorityComparison(),
        employeeAPI.statistics(),
      ]);
      setRiskDistribution(riskDist);
      setDepartmentData(deptData);
      setSeniorityData(senData);
      setEmployeeStats(empStats);
    } catch (error) {
      console.error('Failed to load assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-teal-500"></div>
            </div>
            <p className="mt-6 text-slate-600 font-medium">Loading assessment data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate overall risk score from distribution
  const calculateOverallRiskScore = () => {
    if (!riskDistribution) return 0;
    const total = riskDistribution.critical_count + riskDistribution.high_count +
                  riskDistribution.medium_count + riskDistribution.low_count;
    if (total === 0) return 0;

    const weightedScore = (
      (riskDistribution.critical_count * 10) +
      (riskDistribution.high_count * 7.5) +
      (riskDistribution.medium_count * 5) +
      (riskDistribution.low_count * 2.5)
    ) / total;

    return weightedScore.toFixed(1);
  };

  const overallScore = calculateOverallRiskScore();

  // Build risk factors from actual data
  const riskFactors = [];

  if (employeeStats) {
    riskFactors.push({
      category: 'Technical Literacy',
      score: employeeStats.avg_technical_literacy,
      trend: employeeStats.avg_technical_literacy >= 7 ? 'improving' : employeeStats.avg_technical_literacy >= 5 ? 'stable' : 'declining',
      description: `Average employee technical literacy is ${employeeStats.avg_technical_literacy.toFixed(1)}/10`,
      color: employeeStats.avg_technical_literacy >= 7 ? 'from-green-500 to-emerald-500' : employeeStats.avg_technical_literacy >= 5 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500',
    });
  }

  if (riskDistribution) {
    const phishingScore = 10 - parseFloat(overallScore);
    riskFactors.push({
      category: 'Phishing Susceptibility',
      score: phishingScore,
      trend: phishingScore >= 7 ? 'improving' : phishingScore >= 5 ? 'stable' : 'declining',
      description: `Overall risk score indicates ${overallScore}/10 vulnerability level`,
      color: phishingScore >= 7 ? 'from-green-500 to-emerald-500' : phishingScore >= 5 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500',
    });
  }

  if (departmentData) {
    const avgDeptRisk = departmentData.reduce((sum: number, d: any) => sum + d.avg_risk_score, 0) / departmentData.length;
    riskFactors.push({
      category: 'Department Exposure',
      score: 10 - avgDeptRisk,
      trend: avgDeptRisk <= 5 ? 'improving' : avgDeptRisk <= 7 ? 'stable' : 'declining',
      description: `Average department risk score is ${avgDeptRisk.toFixed(1)}/10`,
      color: avgDeptRisk <= 5 ? 'from-green-500 to-emerald-500' : avgDeptRisk <= 7 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500',
    });
  }

  if (seniorityData) {
    const avgSeniorityRisk = seniorityData.reduce((sum: number, s: any) => sum + s.avg_risk_score, 0) / seniorityData.length;
    riskFactors.push({
      category: 'Training Compliance',
      score: 10 - avgSeniorityRisk,
      trend: avgSeniorityRisk <= 5 ? 'improving' : avgSeniorityRisk <= 7 ? 'stable' : 'declining',
      description: `Seniority-based risk analysis shows ${avgSeniorityRisk.toFixed(1)}/10 average`,
      color: avgSeniorityRisk <= 5 ? 'from-green-500 to-emerald-500' : avgSeniorityRisk <= 7 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500',
    });
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Risk Assessment
            </h1>
            <p className="text-slate-500 mt-1">Comprehensive risk analysis and reporting</p>
          </div>
          <button
            onClick={() => alert('Generate report functionality coming soon')}
            className="group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Generate Report</span>
            </div>
          </button>
        </div>

        {/* Overall Risk Score */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-600 mb-2">Overall Risk Score</h2>
              <div className="flex items-end space-x-3">
                <div className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {overallScore}
                </div>
                <div className="text-2xl font-semibold text-slate-400 mb-2">/10</div>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                {parseFloat(overallScore) < 5 ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Low risk - Good security posture</span>
                  </>
                ) : parseFloat(overallScore) < 7 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">Medium risk - Attention needed</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-600">High risk - Immediate action required</span>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full blur-3xl opacity-30"></div>
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-slate-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(parseFloat(overallScore) / 10) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-16 h-16 text-teal-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Factors Grid */}
        {riskFactors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {riskFactors.map((factor, idx) => (
              <RiskFactorCard key={idx} {...factor} />
            ))}
          </div>
        )}

        {/* Assessment Actions */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Assessment Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AssessmentTool
              title="Run Assessment"
              description="Execute comprehensive risk assessment"
              icon={<Target className="w-6 h-6" />}
              gradient="from-blue-500 to-cyan-500"
              onClick={() => alert('Assessment functionality coming soon')}
            />
            <AssessmentTool
              title="View Reports"
              description="Access historical assessment reports"
              icon={<FileText className="w-6 h-6" />}
              gradient="from-purple-500 to-pink-500"
              onClick={() => alert('Reports functionality coming soon')}
            />
            <AssessmentTool
              title="Export Data"
              description="Download risk data for analysis"
              icon={<Download className="w-6 h-6" />}
              gradient="from-orange-500 to-red-500"
              onClick={() => analyticsAPI.export({ format: 'csv' }).then(() => alert('Export started'))}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Risk Factor Card Component
interface RiskFactorCardProps {
  category: string;
  score: number;
  trend: string;
  description: string;
  color: string;
}

function RiskFactorCard({ category, score, trend, description, color }: RiskFactorCardProps) {
  const trendIcons = {
    improving: <TrendingDown className="w-4 h-4 text-green-500" />,
    declining: <TrendingDown className="w-4 h-4 text-red-500 transform rotate-180" />,
    stable: <div className="w-4 h-4 flex items-center"><div className="w-4 h-0.5 bg-yellow-500"></div></div>,
  };

  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{category}</h3>
          {trendIcons[trend as keyof typeof trendIcons]}
        </div>
        <div className="flex items-end space-x-2 mb-4">
          <div className={`text-4xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
            {score.toFixed(1)}
          </div>
          <div className="text-xl font-semibold text-slate-400 mb-1">/10</div>
        </div>
        <p className="text-sm text-slate-600">{description}</p>
        <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
            style={{ width: `${(score / 10) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

// Assessment Tool Component
interface AssessmentToolProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}

function AssessmentTool({ title, description, icon, gradient, onClick }: AssessmentToolProps) {
  return (
    <button
      onClick={onClick}
      className="group relative backdrop-blur-xl bg-white/60 rounded-xl border border-white/20 shadow-lg p-6 text-left hover:scale-105 transition-all"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity rounded-xl`}></div>
      <div className="relative">
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </button>
  );
}
