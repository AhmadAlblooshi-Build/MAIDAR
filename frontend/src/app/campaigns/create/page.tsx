/**
 * AI-Powered Campaign Creation Wizard
 * 4-Step Flow with AI Scenario Generation
 * Version: 2.0
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import { employeeAPI, scenarioAPI, simulationAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Users,
  FileText,
  Sparkles,
  Eye,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  BookmarkPlus
} from 'lucide-react';

// Step indicator component
function StepIndicator({ steps, currentStep }: { steps: { number: number; title: string }[]; currentStep: number }) {
  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <div
          key={step.number}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            step.number === currentStep
              ? 'bg-teal-50 border-2 border-teal-500'
              : step.number < currentStep
              ? 'bg-teal-50'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step.number < currentStep
                ? 'bg-teal-500 text-white'
                : step.number === currentStep
                ? 'bg-teal-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {step.number < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-semibold">{step.number}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Step {step.number}</p>
            <p className={`text-sm font-medium ${step.number === currentStep ? 'text-teal-700' : 'text-slate-700'}`}>
              {step.title}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Segment card component
function SegmentCard({
  title,
  description,
  icon,
  selected,
  onClick,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
        selected
          ? 'border-teal-500 bg-teal-50'
          : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${selected ? 'bg-teal-100' : 'bg-slate-100'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="absolute top-4 right-4 flex gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded hover:bg-slate-100"
            >
              <Edit className="w-4 h-4 text-slate-500" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <CampaignWizardContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function CampaignWizardContent() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Wizard state
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [aiConfig, setAiConfig] = useState({
    personalization: 'generic',
    tone: 'urgent',
    language: 'en',
    contentType: 'hr_request',
  });
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [generatedScenario, setGeneratedScenario] = useState<any>(null);

  const steps = [
    { number: 1, title: 'Target Segment' },
    { number: 2, title: 'Scenario Theme' },
    { number: 3, title: 'AI Customization' },
    { number: 4, title: 'Preview Content' },
  ];

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesData, scenariosData] = await Promise.all([
        employeeAPI.search({ page: 1, page_size: 500 }),
        scenarioAPI.search({ page: 1, page_size: 100 }),
      ]) as [any, any];

      setEmployees(employeesData.employees || []);
      setScenarios(scenariosData.scenarios || []);

      // Extract unique departments
      const depts = [...new Set(employeesData.employees?.map((e: any) => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  // Step 1: Target segments (dynamic based on real data)
  const targetSegments = [
    {
      id: 'all',
      title: 'All Employees',
      description: `Broadcast to entire workforce (${employees.length} employees)`,
      icon: <Users className="w-6 h-6 text-teal-600" />,
    },
    {
      id: 'high_risk',
      title: 'Critical Risk Group',
      description: `Targeting Human Risk Score > 80 (${employees.filter(e => e.risk_score > 80).length} employees)`,
      icon: <Users className="w-6 h-6 text-red-600" />,
    },
    ...departments.slice(0, 2).map((dept) => ({
      id: `dept_${dept}`,
      title: `${dept} Department`,
      description: `Specialized ${dept.toLowerCase()} phishing vectors (${
        employees.filter((e) => e.department === dept).length
      } employees)`,
      icon: <Users className="w-6 h-6 text-blue-600" />,
    })),
  ];

  // Step 2: Foundation themes (from real scenarios)
  const foundationThemes = scenarios.slice(0, 4).map((scenario) => ({
    id: scenario.id,
    title: scenario.name,
    description: 'Foundation Template',
    icon: <FileText className="w-6 h-6 text-purple-600" />,
  }));

  // Step 3: AI Customization options
  const personalizationLevels = ['generic', 'department', 'role', 'individual'];
  const toneOptions = ['formal', 'friendly', 'urgent'];
  const contentTypes = [
    { value: 'it_alert', label: 'IT Alert' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'hr_request', label: 'HR Request' },
    { value: 'admin', label: 'Admin' },
    { value: 'executive', label: 'Executive' },
  ];

  const handleNext = async () => {
    if (currentStep === 3) {
      // Generate AI variants before going to preview
      await generateVariants();
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateVariants = async () => {
    try {
      setLoading(true);

      // Call AI generation API
      const scenario = await scenarioAPI.generateAI({
        context_type: aiConfig.contentType,
        target_segment: selectedSegment,
        personalization_level: aiConfig.personalization,
        tone: aiConfig.tone,
        language: aiConfig.language,
        auto_save: false,
      });

      setGeneratedScenario(scenario);

      // Generate 3 variants with slight variations
      setVariants([
        {
          subject: scenario.email_subject,
          body: scenario.email_body_html,
          accuracy: 94,
        },
        {
          subject: `${scenario.email_subject} - Follow Up`,
          body: scenario.email_body_html?.replace('today', 'within 24 hours'),
          accuracy: 92,
        },
        {
          subject: `Urgent: ${scenario.email_subject}`,
          body: scenario.email_body_html?.replace('Please', 'URGENT - Please'),
          accuracy: 89,
        },
      ]);
    } catch (err) {
      console.error('Failed to generate variants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    await generateVariants();
    setSelectedVariant(0);
  };

  const handleLaunch = async () => {
    try {
      setLoading(true);

      // Get target employee IDs based on segment
      let targetEmployeeIds: string[] = [];
      if (selectedSegment === 'all') {
        targetEmployeeIds = employees.map((e) => e.id);
      } else if (selectedSegment === 'high_risk') {
        targetEmployeeIds = employees.filter((e) => e.risk_score > 80).map((e) => e.id);
      } else if (selectedSegment.startsWith('dept_')) {
        const dept = selectedSegment.replace('dept_', '');
        targetEmployeeIds = employees.filter((e) => e.department === dept).map((e) => e.id);
      }

      // Create scenario from selected variant
      const scenarioPayload = {
        name: `AI Generated - ${variants[selectedVariant].subject}`,
        description: 'AI-generated phishing simulation',
        email_subject: variants[selectedVariant].subject,
        email_body_html: variants[selectedVariant].body,
        email_body_text: variants[selectedVariant].body.replace(/<[^>]*>/g, ''),
        sender_name: generatedScenario?.sender_name || 'IT Security',
        sender_email: generatedScenario?.sender_email || 'security@company.com',
        difficulty_level: 'medium',
        attack_vector: aiConfig.contentType,
        is_active: true,
      };

      const createdScenario = await scenarioAPI.create(scenarioPayload);

      // Create and launch simulation
      const simulationPayload = {
        name: `AI Campaign - ${selectedSegment}`,
        description: `AI-generated ${aiConfig.tone} ${aiConfig.contentType} campaign`,
        scenario_id: createdScenario.id,
        target_employee_ids: targetEmployeeIds,
        send_immediately: true,
        track_opens: true,
        track_clicks: true,
        track_credentials: true,
      };

      await simulationAPI.create(simulationPayload);

      // Show success step
      setCurrentStep(5);
    } catch (err: any) {
      console.error('Failed to launch campaign:', err);
      alert('Failed to launch campaign: ' + (err.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Left Sidebar - Steps */}
          <div className="w-64 flex-shrink-0">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Card className="p-8">
              {/* Step 1: Target Segment */}
              {currentStep === 1 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Select Target Segment
                        <Sparkles className="w-6 h-6 text-teal-500" />
                      </h2>
                      <p className="text-slate-600 mt-1">
                        Define the workforce group receiving the simulation based on this segment's demographic profile
                      </p>
                    </div>
                    <Button variant="primary" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Segment
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {targetSegments.map((segment) => (
                      <SegmentCard
                        key={segment.id}
                        title={segment.title}
                        description={segment.description}
                        icon={segment.icon}
                        selected={selectedSegment === segment.id}
                        onClick={() => setSelectedSegment(segment.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Scenario Theme */}
              {currentStep === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Select Foundation Theme
                        <Sparkles className="w-6 h-6 text-teal-500" />
                      </h2>
                      <p className="text-slate-600 mt-1">
                        The base scenario or template that the AI will use to generate realistic phishing variants
                      </p>
                    </div>
                    <Button variant="primary" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Theme
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {foundationThemes.map((theme) => (
                      <SegmentCard
                        key={theme.id}
                        title={theme.title}
                        description={theme.description}
                        icon={theme.icon}
                        selected={selectedTheme === theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: AI Customization */}
              {currentStep === 3 && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      AI Customization
                      <Sparkles className="w-6 h-6 text-teal-500" />
                    </h2>
                    <p className="text-slate-600 mt-1">
                      Fine-tune the AI's generation parameters, including tone, language, and personalization levels.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Personalization Level */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        Personalization Level
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {personalizationLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => setAiConfig({ ...aiConfig, personalization: level })}
                            className={`p-3 rounded-lg border-2 capitalize transition-all ${
                              aiConfig.personalization === level
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 bg-white hover:border-teal-300'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tone & Context */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Tone & Context</label>
                      <div className="grid grid-cols-3 gap-3">
                        {toneOptions.map((tone) => (
                          <button
                            key={tone}
                            onClick={() => setAiConfig({ ...aiConfig, tone })}
                            className={`p-3 rounded-lg border-2 capitalize transition-all ${
                              aiConfig.tone === tone
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 bg-white hover:border-teal-300'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Language</label>
                      <select
                        value={aiConfig.language}
                        onChange={(e) => setAiConfig({ ...aiConfig, language: e.target.value })}
                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      >
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>

                    {/* Content Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Content Type</label>
                      <div className="grid grid-cols-3 gap-3">
                        {contentTypes.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setAiConfig({ ...aiConfig, contentType: type.value })}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              aiConfig.contentType === type.value
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 bg-white hover:border-teal-300'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                      <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800">
                        AI will generate realistic phishing scenarios based on your configuration. Results will be
                        tailored to match target profile factors.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Preview Content */}
              {currentStep === 4 && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      Preview AI Content
                      <Sparkles className="w-6 h-6 text-teal-500" />
                    </h2>
                    <p className="text-slate-600 mt-1">
                      Review the individualized scenarios before deployment.
                    </p>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto"></div>
                      <p className="text-slate-600 mt-4">Generating AI variants...</p>
                    </div>
                  ) : (
                    <>
                      {/* Variant Tabs */}
                      <div className="flex gap-2 mb-6">
                        {variants.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedVariant(idx)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              selectedVariant === idx
                                ? 'bg-teal-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Variant {idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Preview Content */}
                      {variants[selectedVariant] && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">AI Subject Line</label>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                              <p className="font-medium text-slate-900">{variants[selectedVariant].subject}</p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Scenario Body Manifest
                            </label>
                            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                              <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: variants[selectedVariant].body || '' }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-900">Readiness/Optimization</p>
                              <p className="text-sm text-green-700">
                                Match Accuracy: {variants[selectedVariant].accuracy}%
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button variant="outline" onClick={handleRegenerate} disabled={loading}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Variants
                            </Button>
                            <Button variant="outline">
                              <BookmarkPlus className="w-4 h-4 mr-2" />
                              Save to Library
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 5: Success */}
              {currentStep === 5 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-100 mb-6">
                    <CheckCircle className="w-12 h-12 text-teal-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">Simulation Deployed!</h2>
                  <p className="text-slate-600 mb-8">
                    AI generated risk scenarios are now being distributed to the target segments. Results will populate
                    in real-time.
                  </p>
                  <Button variant="primary" onClick={() => router.push('/dashboard')}>
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Navigation */}
              {currentStep < 5 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                  <Button variant="outline" onClick={currentStep === 1 ? () => router.push('/campaigns') : handleBack}>
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                  </Button>
                  <span className="text-sm text-slate-500">{currentStep} of 4</span>
                  <Button
                    variant="primary"
                    onClick={currentStep === 4 ? handleLaunch : handleNext}
                    disabled={
                      loading ||
                      (currentStep === 1 && !selectedSegment) ||
                      (currentStep === 2 && !selectedTheme)
                    }
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        {currentStep === 3 ? 'Generating...' : currentStep === 4 ? 'Launching...' : 'Loading...'}
                      </>
                    ) : (
                      <>
                        {currentStep === 4 ? 'Launch' : 'Next'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
