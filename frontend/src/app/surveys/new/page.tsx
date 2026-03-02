/**
 * Assessment Creation Wizard - 4 Step Process
 * Step 1: Identity, Step 2: Audience, Step 3: Questions, Step 4: Settings
 */

'use client';

import React, { useState } from 'react';
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
    targetAudience: 'global',
    selectedDepartments: [] as string[],
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
        let questionType: 'multiple_choice' | 'true_false' | 'scenario_based' | 'short_text' = 'multiple_choice';
        if (q.questionType === 'True/False') questionType = 'true_false';
        else if (q.questionType === 'Scenario Based') questionType = 'scenario_based';
        else if (q.questionType === 'Short Text') questionType = 'short_text';

        const validResponses = q.responses
          .filter((r: any) => r.text && r.text.trim() !== '')
          .map((r: any, rIndex: number): QuestionResponse => ({
            response_text: r.text.trim(),
            is_correct: r.isCorrect || undefined,
            order_index: rIndex,
          }));

        return {
          question_text: q.text.trim(),
          question_type: questionType,
          order_index: index,
          responses: validResponses,
        };
      });

      // Validate departmental filter has departments selected
      if (assessment.targetAudience === 'departmental' && assessment.selectedDepartments.length === 0) {
        alert('Please select at least one department for departmental filter');
        setCurrentStep(2);
        return;
      }

      // Create assessment
      const created = await assessmentAPI.create({
        title: assessment.title.trim(),
        category: assessment.category?.trim() || undefined,
        priority: assessment.priority?.trim() || undefined,
        description: assessment.description?.trim() || undefined,
        target_audience: assessment.targetAudience as 'global' | 'departmental' | 'risk' | 'newhires',
        target_departments: assessment.selectedDepartments.length > 0 ? assessment.selectedDepartments : undefined,
        time_limit: assessment.timeLimit || undefined,
        randomize_questions: assessment.randomizeQuestions,
        allow_pause_resume: assessment.allowPauseResume,
        anonymous_responses: assessment.anonymousResponses,
        questions,
      });

      // Deploy the assessment
      await assessmentAPI.deploy(created.id);

      alert('Assessment deployed successfully!');
      router.push('/surveys');
    } catch (err: any) {
      console.error('Failed to deploy assessment:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';
      alert('Failed to deploy assessment: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for question management
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

  const deleteQuestion = (qId: string) => {
    setAssessment({
      ...assessment,
      questions: assessment.questions.filter((q: any) => q.id !== qId),
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

  const deleteResponse = (qId: string, rId: string) => {
    setAssessment({
      ...assessment,
      questions: assessment.questions.map((q: any) =>
        q.id === qId
          ? { ...q, responses: q.responses.filter((r: any) => r.id !== rId) }
          : q
      ),
    });
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
                    <span className="font-bold">{step.num}</span>
                  )}
                </div>
                <span className="font-semibold text-slate-900">{step.label}</span>
              </div>
            ))}
          </div>

          {/* Right Content Area */}
          <div className="col-span-3">
            {/* Steps Content */}
            {currentStep === 1 && <Step1Identity assessment={assessment} setAssessment={setAssessment} />}
            {currentStep === 2 && <Step2Audience assessment={assessment} setAssessment={setAssessment} />}
            {currentStep === 3 && (
              <Step3Questions
                assessment={assessment}
                setAssessment={setAssessment}
                addQuestion={addQuestion}
                updateQuestion={updateQuestion}
                deleteQuestion={deleteQuestion}
                addResponse={addResponse}
                updateResponse={updateResponse}
                deleteResponse={deleteResponse}
              />
            )}
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
                  disabled={loading}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500"
                >
                  {loading ? 'Deploying...' : 'Deploy Assessment'} <Send className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Identity
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
            Assessment Title *
          </label>
          <input
            type="text"
            value={assessment.title}
            onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
            placeholder="Enter assessment title"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <input
              type="text"
              value={assessment.category}
              onChange={(e) => setAssessment({ ...assessment, category: e.target.value })}
              placeholder="e.g., Security"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
            <input
              type="text"
              value={assessment.priority}
              onChange={(e) => setAssessment({ ...assessment, priority: e.target.value })}
              placeholder="e.g., High"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            value={assessment.description}
            onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
            placeholder="Describe the assessment purpose"
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Audience
function Step2Audience({ assessment, setAssessment }: any) {
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [loadingDepartments, setLoadingDepartments] = React.useState(false);

  React.useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const { employeeAPI } = await import('@/lib/api');
      const response = await employeeAPI.search({ page: 1, page_size: 10000 });

      // Extract unique departments
      const uniqueDepts = Array.from(new Set(
        response.employees.map((emp: any) => emp.department).filter(Boolean)
      )).sort();

      setDepartments(uniqueDepts as string[]);
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const toggleDepartment = (dept: string) => {
    const selected = assessment.selectedDepartments || [];
    if (selected.includes(dept)) {
      setAssessment({
        ...assessment,
        selectedDepartments: selected.filter((d: string) => d !== dept),
      });
    } else {
      setAssessment({
        ...assessment,
        selectedDepartments: [...selected, dept],
      });
    }
  };

  const audiences = [
    { id: 'global', label: 'Global Deployment', description: 'All active employees' },
    { id: 'risk', label: 'Risk Threshold', description: 'High-risk employees (score > 68)' },
    { id: 'newhires', label: 'New Hires', description: 'Hired within last 90 days' },
    { id: 'departmental', label: 'Departmental Filter', description: 'Select specific departments' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Target Audience</h2>
        <p className="text-slate-600 mt-2">
          Define the workforce segment for this assessment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {audiences.map((aud) => (
          <div
            key={aud.id}
            onClick={() => setAssessment({ ...assessment, targetAudience: aud.id })}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              assessment.targetAudience === aud.id
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 hover:border-teal-300'
            }`}
          >
            <div className="font-semibold text-lg text-slate-900 mb-1">{aud.label}</div>
            <div className="text-sm text-slate-600">{aud.description}</div>
          </div>
        ))}
      </div>

      {/* Department Selection (shown when Departmental Filter is selected) */}
      {assessment.targetAudience === 'departmental' && (
        <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Select Departments
            {assessment.selectedDepartments && assessment.selectedDepartments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-teal-600">
                ({assessment.selectedDepartments.length} selected)
              </span>
            )}
          </h3>

          {loadingDepartments ? (
            <div className="text-center py-4 text-slate-500">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-4 text-slate-500">No departments found</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {departments.map((dept) => {
                const isSelected = assessment.selectedDepartments?.includes(dept);
                return (
                  <button
                    key={dept}
                    onClick={() => toggleDepartment(dept)}
                    className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-900 font-medium'
                        : 'border-slate-200 hover:border-teal-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm">{dept}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Step 3: Questions
function Step3Questions({ assessment, addQuestion, updateQuestion, deleteQuestion, addResponse, updateResponse, deleteResponse }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Questions</h2>
          <p className="text-slate-600 mt-2">Build your assessment questions</p>
        </div>
        <Button onClick={addQuestion} variant="primary">
          <Plus className="w-4 h-4 mr-2" /> Add Question
        </Button>
      </div>

      {assessment.questions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p>No questions added yet. Click "Add Question" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assessment.questions.map((q: any, index: number) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-4">
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                    placeholder="Enter question text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  <div className="space-y-2">
                    {q.responses.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={r.text}
                          onChange={(e) => updateResponse(q.id, r.id, e.target.value)}
                          placeholder="Response option"
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => deleteResponse(q.id, r.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addResponse(q.id)}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Response
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 4: Settings
function Step4Settings({ assessment, setAssessment }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Assessment Settings</h2>
        <p className="text-slate-600 mt-2">Configure assessment parameters</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Time Limit (minutes)
          </label>
          <input
            type="number"
            value={assessment.timeLimit}
            onChange={(e) => setAssessment({ ...assessment, timeLimit: parseInt(e.target.value) })}
            min={1}
            max={240}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={assessment.randomizeQuestions}
              onChange={(e) => setAssessment({ ...assessment, randomizeQuestions: e.target.checked })}
              className="w-5 h-5 text-teal-600"
            />
            <span className="text-sm font-medium text-slate-700">Randomize question order</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={assessment.allowPauseResume}
              onChange={(e) => setAssessment({ ...assessment, allowPauseResume: e.target.checked })}
              className="w-5 h-5 text-teal-600"
            />
            <span className="text-sm font-medium text-slate-700">Allow pause and resume</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={assessment.anonymousResponses}
              onChange={(e) => setAssessment({ ...assessment, anonymousResponses: e.target.checked })}
              className="w-5 h-5 text-teal-600"
            />
            <span className="text-sm font-medium text-slate-700">Anonymous responses</span>
          </label>
        </div>
      </div>
    </div>
  );
}
