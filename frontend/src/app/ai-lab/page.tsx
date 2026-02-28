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
import { Brain, Zap, Sparkles, Target, Mail, Globe, Cpu, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { scenarioAPI } from '@/lib/api';
import { Scenario } from '@/types';

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
  const [saving, setSaving] = useState(false);
  const [contextType, setContextType] = useState('it_alert');
  const [targetSegment, setTargetSegment] = useState('finance');
  const [personalization, setPersonalization] = useState('department');
  const [tone, setTone] = useState('urgent');
  const [language, setLanguage] = useState('en');
  const [showPreview, setShowPreview] = useState(false);
  const [generatedScenario, setGeneratedScenario] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerate = async (autoSave: boolean = false) => {
    try {
      setGenerating(true);
      setError(null);
      setSuccessMessage(null);

      const scenario = await scenarioAPI.generateAI({
        context_type: contextType,
        target_segment: targetSegment,
        personalization_level: personalization,
        tone,
        language,
        auto_save: autoSave,
      });

      setGeneratedScenario(scenario);
      setShowPreview(true);

      if (autoSave) {
        setSuccessMessage('Scenario generated and saved to library successfully!');
      }
    } catch (err: any) {
      console.error('Failed to generate scenario:', err);
      setError(err.detail || 'Failed to generate scenario. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedScenario) return;

    try {
      setSaving(true);
      setError(null);

      // If it's a preview (id = "preview"), save it
      if (generatedScenario.id === 'preview') {
        await scenarioAPI.create({
          name: generatedScenario.name,
          description: generatedScenario.description,
          category: generatedScenario.category,
          language: generatedScenario.language,
          difficulty: generatedScenario.difficulty,
          email_subject: generatedScenario.email_subject,
          email_body_html: generatedScenario.email_body_html,
          email_body_text: generatedScenario.email_body_text,
          sender_name: generatedScenario.sender_name,
          sender_email: generatedScenario.sender_email,
          has_link: generatedScenario.has_link,
          has_attachment: generatedScenario.has_attachment,
          has_credential_form: generatedScenario.has_credential_form,
        });
        setSuccessMessage('Scenario saved to library successfully!');
      } else {
        setSuccessMessage('Scenario already saved to library!');
      }
    } catch (err: any) {
      console.error('Failed to save scenario:', err);
      setError(err.detail || 'Failed to save scenario. Please try again.');
    } finally {
      setSaving(false);
    }
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

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

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

          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              loading={generating}
              size="lg"
              variant="secondary"
              icon={generating ? undefined : <Zap className="w-5 h-5" />}
            >
              {generating ? 'Generating...' : 'Generate Preview'}
            </Button>
            <Button
              onClick={() => handleGenerate(true)}
              disabled={generating}
              loading={generating}
              size="lg"
              icon={generating ? undefined : <Save className="w-5 h-5" />}
            >
              {generating ? 'Generating...' : 'Generate & Save'}
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
                {[
                  { value: 'it_alert', label: 'IT Alert' },
                  { value: 'hr_notification', label: 'HR Notification' },
                  { value: 'finance_request', label: 'Finance Request' },
                  { value: 'executive_message', label: 'Executive Message' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setContextType(type.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      contextType === type.value
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
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
                { value: 'it', label: 'IT' },
                { value: 'hr', label: 'HR' },
                { value: 'executive', label: 'Executive' },
                { value: 'all_staff', label: 'All Staff' },
              ]}
            />

            <Select
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'Arabic' },
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
                { value: 'professional', label: 'Professional' },
                { value: 'friendly', label: 'Friendly' },
                { value: 'casual', label: 'Casual' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Scenario Preview</h3>
            {generatedScenario && (
              <Badge variant="info">{generatedScenario.difficulty || 'Medium'} Difficulty</Badge>
            )}
          </div>

          {!showPreview || !generatedScenario ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                Configure parameters and generate to see AI-powered scenario preview
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Scenario Name</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900">{generatedScenario.name}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Description</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700">{generatedScenario.description}</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-600">Category</label>
                  <div className="mt-1">
                    <Badge variant="info">{generatedScenario.category}</Badge>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-600">Language</label>
                  <div className="mt-1">
                    <Badge variant="info">{generatedScenario.language.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">From</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900">
                    {generatedScenario.sender_name} &lt;{generatedScenario.sender_email}&gt;
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Subject Line</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    {generatedScenario.email_subject}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Email Body</label>
                <div className="mt-1 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {generatedScenario.email_body_text}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <div className="flex space-x-2 flex-1">
                  {generatedScenario.has_link && (
                    <Badge variant="warning" size="sm">Has Link</Badge>
                  )}
                  {generatedScenario.has_attachment && (
                    <Badge variant="warning" size="sm">Has Attachment</Badge>
                  )}
                  {generatedScenario.has_credential_form && (
                    <Badge variant="error" size="sm">Credential Form</Badge>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={generating}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  Regenerate
                </Button>
                <Button
                  onClick={handleSaveToLibrary}
                  disabled={saving || generatedScenario.id !== 'preview'}
                  loading={saving}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  icon={<Save className="w-4 h-4" />}
                >
                  {generatedScenario.id === 'preview' ? 'Save to Library' : 'Already Saved'}
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
