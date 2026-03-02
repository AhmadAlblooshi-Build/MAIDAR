/**
 * AI Scenario Lab Page - Scenario Generation Hub
 * Generate AI-powered phishing scenarios with preview variants
 */

'use client';

import { useState } from 'react';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [activeVariant, setActiveVariant] = useState(1);

  const handleGenerate = async () => {
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
        auto_save: false,
      });

      setGeneratedScenario(scenario);
      setShowPreview(true);
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

  const handleRegenerateVariants = () => {
    handleGenerate();
  };

  const contextTypes = [
    { value: 'it_alert', label: 'IT Alert' },
    { value: 'hr_notification', label: 'HQ Request' },
    { value: 'finance_request', label: 'Payroll' },
    { value: 'admin', label: 'Admin' },
    { value: 'executive_message', label: 'Executive' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Scenario Generation Hub</h1>
        <p className="text-slate-600 mt-1">
          Design and test high-fidelity risk scenarios tailored to specific workforce segments.
        </p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Generation Parameters */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Generation Parameters</h2>
            <Sparkles className="w-5 h-5 text-teal-500" />
          </div>

          <div className="space-y-6">
            {/* Context Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Context Type</label>
              <div className="grid grid-cols-2 gap-3">
                {contextTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setContextType(type.value)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      contextType === type.value
                        ? 'bg-teal-500 text-white border-2 border-teal-500'
                        : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-teal-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Segment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Segment</label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="finance">Finance</option>
                <option value="it">IT</option>
                <option value="hr">HR</option>
                <option value="executive">Executive</option>
                <option value="all_staff">All Staff</option>
              </select>
            </div>

            {/* Personalization level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Personalization level</label>
              <div className="grid grid-cols-3 gap-3">
                {['generic', 'department', 'individual'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setPersonalization(level)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      personalization === level
                        ? 'bg-slate-100 text-slate-900 border-2 border-slate-300'
                        : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="urgent">Urgent</option>
                  <option value="formal">Formal</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating}
              loading={generating}
              variant="primary"
              className="w-full bg-teal-500 hover:bg-teal-600 text-white"
              icon={<Sparkles className="w-4 h-4" />}
            >
              {generating ? 'Generating...' : 'Generate Scenario'}
            </Button>
          </div>
        </Card>

        {/* Right Side - Preview */}
        <Card>
          {!showPreview || !generatedScenario ? (
            /* Scenario Intelligence Preview */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-teal-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">Scenario Intelligence Preview</h2>
              <p className="text-center text-slate-600 max-w-md mb-8">
                Define workforce demographic and tone parameters to visualize localized and tailored risk scenarios.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                loading={generating}
                variant="primary"
                className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                icon={<Sparkles className="w-4 h-4" />}
              >
                {generating ? 'Initializing...' : 'Initialize Model'}
              </Button>
            </div>
          ) : (
            /* Preview AI Content */
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Preview AI Content</h2>
                <p className="text-sm text-slate-600">Review the individualized scenarios.</p>
              </div>

              {/* Variant Tabs */}
              <div className="flex gap-2 border-b border-slate-200">
                {[1, 2, 3].map((variant) => (
                  <button
                    key={variant}
                    onClick={() => setActiveVariant(variant)}
                    className={`px-6 py-2 text-sm font-medium transition-all ${
                      activeVariant === variant
                        ? 'border-b-2 border-teal-500 text-teal-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Variant {variant}
                  </button>
                ))}
              </div>

              {/* AI Generated Subject */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                  AI Generated Subject
                </label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-lg font-semibold text-slate-900">
                    {generatedScenario.email_subject}
                  </p>
                </div>
              </div>

              {/* Message Manifest Preview */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                  Message Manifest Preview
                </label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-64 overflow-y-auto space-y-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {generatedScenario.email_body_text}
                  </p>
                  {generatedScenario.sender_name && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-600">
                        {generatedScenario.sender_name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Readiness Optimization */}
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">Readiness Optimization</p>
                  <p className="text-xs text-green-700">Match Accuracy: 94%</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveToLibrary}
                  disabled={saving || generatedScenario.id !== 'preview'}
                  loading={saving}
                  variant="secondary"
                  className="flex-1"
                >
                  {generatedScenario.id === 'preview' ? 'Save to Library' : 'Already Saved'}
                </Button>
                <Button
                  onClick={handleRegenerateVariants}
                  disabled={generating}
                  loading={generating}
                  variant="primary"
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Regenerate Variants
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
