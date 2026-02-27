/**
 * AI Scenario Lab Page
 * Generate AI-powered phishing scenarios
 */

'use client';

import { useState } from 'react';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Brain, Zap, Sparkles, Target, Mail, Globe, Cpu } from 'lucide-react';

export default function AILabPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <AILabContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function AILabContent() {
  const [generating, setGenerating] = useState(false);
  const [contextType, setContextType] = useState('it_alert');
  const [targetSegment, setTargetSegment] = useState('finance');
  const [personalization, setPersonalization] = useState('department');
  const [tone, setTone] = useState('urgent');
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowPreview(true);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            AI Scenario Lab
          </h1>
          <p className="text-slate-500 mt-1">
            Generate intelligent phishing scenarios powered by AI
          </p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50">
          <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
          <span className="text-sm font-medium text-purple-700">AI Powered</span>
        </div>
      </div>

      <div className="relative overflow-hidden backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />

        <div className="relative p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative p-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-slate-900 mb-4">
            Generate AI-Powered Scenario
          </h2>
          <p className="text-center text-slate-600 mb-8 max-w-2xl mx-auto">
            Our AI analyzes your organization's data, recent trends, and employee profiles to create
            highly realistic and effective phishing scenarios tailored to your needs.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              loading={generating}
              size="lg"
              icon={generating ? undefined : <Zap className="w-5 h-5" />}
            >
              {generating ? 'Generating...' : 'Generate Scenario'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Generation Parameters</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Context Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['IT Alert', 'HR Request', 'Payroll', 'Admin', 'Executive', 'Other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setContextType(type.toLowerCase().replace(' ', '_'))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      contextType === type.toLowerCase().replace(' ', '_')
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <Select
              label="Target Segment"
              value={targetSegment}
              onChange={(e) => setTargetSegment(e.target.value)}
              options={[
                { value: 'finance', label: 'Finance' },
                { value: 'engineering', label: 'Engineering' },
                { value: 'hr', label: 'HR' },
                { value: 'executive', label: 'Executive' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Personalization</label>
              <div className="space-y-2">
                {[
                  { value: 'generic', label: 'Generic' },
                  { value: 'department', label: 'Department' },
                  { value: 'role', label: 'Role' },
                  { value: 'individual', label: 'Individual' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="personalization"
                      value={option.value}
                      checked={personalization === option.value}
                      onChange={(e) => setPersonalization(e.target.value)}
                      className="w-4 h-4 text-teal-500"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Select
              label="Tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'formal', label: 'Formal' },
                { value: 'friendly', label: 'Friendly' },
                { value: 'casual', label: 'Casual' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Scenario Preview</h3>
            <Badge variant="info">Match Accuracy 94%</Badge>
          </div>

          {!showPreview ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                Configure parameters and generate to see AI-powered scenario preview
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Subject Line</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900">
                    Action Required: Your security token is expiring
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Email Body</label>
                <div className="mt-1 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    Hello [Employee Name],

To maintain access to corporate systems, you must update your security token before it expires tomorrow at 5:00 PM.

Click here to verify your credentials: [Phishing Link]

This is a mandatory security update required by the IT department.

Best regards,
IT Security Team
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="secondary" size="sm" className="flex-1">
                  Regenerate
                </Button>
                <Button variant="primary" size="sm" className="flex-1">
                  Save to Library
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Scenario Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScenarioTypeCard
            title="Spear Phishing"
            description="Targeted attacks using personalized information"
            icon={<Target className="w-6 h-6" />}
            gradient="from-red-500 to-rose-500"
            difficulty="Advanced"
          />
          <ScenarioTypeCard
            title="CEO Fraud"
            description="Executive impersonation for financial fraud"
            icon={<Mail className="w-6 h-6" />}
            gradient="from-orange-500 to-amber-500"
            difficulty="Expert"
          />
          <ScenarioTypeCard
            title="Credential Harvesting"
            description="Fake login pages to steal credentials"
            icon={<Globe className="w-6 h-6" />}
            gradient="from-blue-500 to-cyan-500"
            difficulty="Intermediate"
          />
          <ScenarioTypeCard
            title="Business Email Compromise"
            description="Sophisticated email-based social engineering"
            icon={<Cpu className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-500"
            difficulty="Advanced"
          />
        </div>
      </div>
    </div>
  );
}

function ScenarioTypeCard({
  title,
  description,
  icon,
  gradient,
  difficulty,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  difficulty: string;
}) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`} />
      <div className="relative backdrop-blur-xl bg-white/60 rounded-xl border border-white/20 shadow-lg p-6 hover:scale-105 transition-all">
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
        <Badge variant="info" size="sm">{difficulty}</Badge>
      </div>
    </div>
  );
}
