/**
 * Assessment Creation Wizard - 4 Step Process
 * Step 1: Identity, Step 2: Audience, Step 3: Questions, Step 4: Settings
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Button from '@/components/ui/Button';
import assessmentAPI, { Question, QuestionResponse } from '@/lib/api/assessment';
import {
  Check,
  ChevronRight,
  Target,
  GripVertical,
  Trash2,
  Plus,
  Send,
  AlertCircle,
  CheckSquare,
  FileText,
} from 'lucide-react';

export default function NewAssessmentPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <AssessmentWizard />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function AssessmentWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState({
    // Step 1 - Identity
    title: '',
    category: '',
    priority: '',
    description: '',
    // Step 2 - Audience
    targetAudience: 'global', // global, departmental, risk, newhires
    // Step 3 - Questions
    questions: [] as any[],
    // Step 4 - Settings
    timeLimit: 4,
    randomizeQuestions: true,
    allowPauseResume: false,
    anonymousResponses: false,
  });

  const steps = [
    { num: 1, label: 'Identity', completed: currentStep > 1 },
    { num: 2, label: 'Audience', completed: currentStep > 2 },
    { num: 3, label: 'Questions', completed: currentStep > 3 },
    { num: 4, label: 'Settings', completed: currentStep > 4 },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
      router.push('/surveys');
    }
  };

  const handleDeploy = async () => {
    try {
      setLoading(true);

      // Validate basic fields
      if (!assessment.title.trim()) {
        alert('Please provide a title for the assessment');
        setCurrentStep(1);
        return;
      }

      if (assessment.questions.length === 0) {
        alert('Please add at least one question to the assessment');
        setCurrentStep(3);
        return;
      }

      // Transform questions to API format
      const questions: Question[] = assessment.questions.map((q, index) => {
        // Map question type from display format to API format
        let questionType: 'multiple_choice' | 'true_false' | 'scenario_based' | 'short_text' = 'multiple_choice';
        if (q.questionType === 'True/False') questionType = 'true_false';
        else if (q.questionType === 'Scenario Based') questionType = 'scenario_based';
        else if (q.questionType === 'Short Text') questionType = 'short_text';

        return {
          question_text: q.text || 'Untitled Question',
          question_type: questionType,
          order_index: index,
          responses: q.responses.map((r: any, rIndex: number): QuestionResponse => ({
            response_text: r.text || '',
            is_correct: r.isCorrect || undefined,
            order_index: rIndex,
          })),
        };
      });

      // Create assessment
      const created = await assessmentAPI.create({
        title: assessment.title,
        category: assessment.category || undefined,
        priority: assessment.priority || undefined,
        description: assessment.description || undefined,
        target_audience: assessment.targetAudience as 'global' | 'departmental' | 'risk' | 'newhires',
        time_limit: assessment.timeLimit || undefined,
        randomize_questions: assessment.randomizeQuestions,
        allow_pause_resume: assessment.allowPauseResume,
        anonymous_responses: assessment.anonymousResponses,
        questions,
      });

      // Deploy the assessment (make it active)
      await assessmentAPI.deploy(created.id);

      alert('Assessment deployed successfully!');
      router.push('/surveys');
    } catch (error: any) {
      console.error('Failed to deploy assessment:', error);
      console.error('Error details:', error.response?.data);

      let errorMessage = 'Unknown error occurred';
      if (error.response?.data?.detail) {
        // Handle both string and array of errors
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`Failed to deploy assessment: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-8 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-8">
          {/* Left Sidebar - Steps */}
          <div className="col-span-1 space-y-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                  currentStep === step.num
                    ? 'bg-white border-2 border-teal-500 shadow-sm'
                    : step.completed
                    ? 'bg-teal-50 border border-teal-200'
                    : 'bg-white border border-slate-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    currentStep === step.num
                      ? 'bg-teal-500 text-white'
                      : step.completed
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.completed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-lg font-bold">{step.num}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Step {step.num}</div>
                  <div className={`font-semibold ${currentStep === step.num ? 'text-slate-900' : 'text-slate-600'}`}>
                    {step.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 min-h-[600px]">
              {currentStep === 1 && <Step1Identity assessment={assessment} setAssessment={setAssessment} />}
              {currentStep === 2 && <Step2Audience assessment={assessment} setAssessment={setAssessment} />}
              {currentStep === 3 && <Step3Questions assessment={assessment} setAssessment={setAssessment} />}
              {currentStep === 4 && <Step4Settings assessment={assessment} setAssessment={setAssessment} />}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-200">
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>

                <div className="text-slate-500 font-medium">
                  {currentStep} of 4
                </div>

                {currentStep < 4 ? (
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleDeploy}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500"
                  >
                    Deploy Assessment <Send className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Assessment Identity
function Step1Identity({ assessment, setAssessment }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Assessment Identity</h2>
        <p className="text-slate-600 mt-2">
          Provide the fundamental details of this security intelligence gathering.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Assessment Title
          </label>
          <input
            type="text"
            value={assessment.title}
            onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
            placeholder="Enter Assessment Title"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={assessment.category}
              onChange={(e) => setAssessment({ ...assessment, category: e.target.value })}
              placeholder="Enter Category"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Priority
            </label>
            <input
              type="text"
              value={assessment.priority}
              onChange={(e) => setAssessment({ ...assessment, priority: e.target.value })}
              placeholder="Enter Priority"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Internal Description
          </label>
          <textarea
            value={assessment.description}
            onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
            placeholder="What intelligence are we trying to gather?"
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Caution:</span> Assessments are permanent record points in the Human Risk Profile.
          Review all questions for clarity and compliance before final deployment.
        </p>
      </div>
    </div>
  );
}

// Step 2: Target Audience
function Step2Audience({ assessment, setAssessment }: any) {
  const audienceOptions = [
    {
      id: 'global',
      icon: <Target className="w-6 h-6" />,
      title: 'Global Deployment',
      description: 'Every employee in the organization (1,248)',
    },
    {
      id: 'departmental',
      icon: <Target className="w-6 h-6" />,
      title: 'Departmental Filter',
      description: 'Select specific teams (Engineering, Finance)',
    },
    {
      id: 'risk',
      icon: <Target className="w-6 h-6" />,
      title: 'Risk Threshold',
      description: 'Target only users with risk score > 68',
    },
    {
      id: 'newhires',
      icon: <Target className="w-6 h-6" />,
      title: 'New Hires',
      description: 'Employees joined in the last 30 days',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Define Target Audience</h2>
        <p className="text-slate-600 mt-2">Who should participate in this assessment?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {audienceOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setAssessment({ ...assessment, targetAudience: option.id })}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              assessment.targetAudience === option.id
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              assessment.targetAudience === option.id ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {option.icon}
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{option.title}</h3>
            <p className="text-sm text-slate-600">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 3: Question Architect
function Step3Questions({ assessment, setAssessment }: any) {
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      text: '',
      responses: [{ id: '1', text: '' }],
      questionType: 'Multiple Choice',
    };
    setAssessment({
      ...assessment,
      questions: [...assessment.questions, newQuestion],
    });
  };

  const updateQuestion = (qId: string, field: string, value: any) => {
    setAssessment({
      ...assessment,
      questions: assessment.questions.map((q: any) =>
        q.id === qId ? { ...q, [field]: value } : q
      ),
    });
  };

  const addResponse = (qId: string) => {
    setAssessment({
      ...assessment,
      questions: assessment.questions.map((q: any) =>
        q.id === qId
          ? { ...q, responses: [...q.responses, { id: Date.now().toString(), text: '' }] }
          : q
      ),
    });
  };

  const updateResponse = (qId: string, rId: string, text: string) => {
    setAssessment({
      ...assessment,
      questions: assessment.questions.map((q: any) =>
        q.id === qId
          ? {
              ...q,
              responses: q.responses.map((r: any) =>
                r.id === rId ? { ...r, text } : r
              ),
            }
          : q
      ),
    });
  };

  const removeQuestion = (qId: string) => {
    setAssessment({
      ...assessment,
      questions: assessment.questions.filter((q: any) => q.id !== qId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Question Architect</h2>
          <p className="text-slate-600 mt-2">Add and customize questions for your assessment.</p>
        </div>
        <Button
          variant="primary"
          onClick={addQuestion}
          className="bg-gradient-to-r from-teal-500 to-cyan-500"
        >
          Add Question
        </Button>
      </div>

      <div className="space-y-4">
        {assessment.questions.map((question: any, index: number) => (
          <div key={question.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <div className="flex items-start gap-4">
              <GripVertical className="w-5 h-5 text-slate-400 mt-3 flex-shrink-0 cursor-move" />
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                    index {index + 1}
                  </div>
                  <button
                    onClick={() => removeQuestion(question.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="text"
                  value={question.text}
                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                  placeholder="Type your question prompt here..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />

                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-3">Response Nodes</div>
                  <div className="space-y-2">
                    {question.responses.map((response: any, rIndex: number) => (
                      <div key={response.id} className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded bg-teal-100 text-teal-700 text-xs font-medium">
                          Node {rIndex + 1}
                        </div>
                        <input
                          type="text"
                          value={response.text}
                          onChange={(e) => updateResponse(question.id, response.id, e.target.value)}
                          placeholder={`Option ${rIndex + 1}`}
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <select
                      value={question.questionType}
                      onChange={(e) => updateQuestion(question.id, 'questionType', e.target.value)}
                      className="px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option>Multiple Choice</option>
                      <option>True/False</option>
                      <option>Scenario Based</option>
                      <option>Short Text</option>
                    </select>

                    <button
                      onClick={() => addResponse(question.id)}
                      className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> RESPONSE NODE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {assessment.questions.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No questions added yet. Click "Add Question" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 4: Deployment Strategy
function Step4Settings({ assessment, setAssessment }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Deployment Strategy</h2>
        <p className="text-slate-600 mt-2">
          Fine-tune how this assessment is delivered and monitored across the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Global Time Limit (Minutes)
            </label>
            <input
              type="number"
              value={assessment.timeLimit}
              onChange={(e) => setAssessment({ ...assessment, timeLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={assessment.randomizeQuestions}
                onChange={(e) => setAssessment({ ...assessment, randomizeQuestions: e.target.checked })}
                className="w-5 h-5 text-teal-600 rounded"
              />
              <span className="text-sm font-medium text-slate-700">Randomize question order</span>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={assessment.allowPauseResume}
                onChange={(e) => setAssessment({ ...assessment, allowPauseResume: e.target.checked })}
                className="w-5 h-5 text-teal-600 rounded"
              />
              <span className="text-sm font-medium text-slate-700">Allow users to pause & resume</span>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={assessment.anonymousResponses}
                onChange={(e) => setAssessment({ ...assessment, anonymousResponses: e.target.checked })}
                className="w-5 h-5 text-teal-600 rounded"
              />
              <span className="text-sm font-medium text-slate-700">Anonymous responses only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Send className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Mission Ready</h3>
            <p className="text-sm text-slate-600 max-w-xs">
              Deployment targets 1,248 workforce profiles. Live intelligence streaming will initialize upon transmission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
