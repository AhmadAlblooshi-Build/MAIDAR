/**
 * Assessment Creation Wizard - 4 Step Process
 * Step 1: Identity, Step 2: Audience, Step 3: Questions, Step 4: Settings
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  const [totalEmployees, setTotalEmployees] = useState(0);
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

  // Load employee count for audience step
  useEffect(() => {
    loadEmployeeCount();
  }, []);

  const loadEmployeeCount = async () => {
    try {
      const { employeeAPI } = await import('@/lib/api');
      const response = await employeeAPI.search({ page: 1, page_size: 100 });
      setTotalEmployees(response.total || 0);
    } catch (error) {
      console.error('Failed to load employee count:', error);
    }
  };

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

      // Validate departmental filter has departments selected
      if (assessment.targetAudience === 'departmental' && assessment.selectedDepartments.length === 0) {
        alert('Please select at least one department for departmental filter');
        setCurrentStep(2);
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
      responses: [{ id: '1', text: '', isCorrect: false }],
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
          ? { ...q, responses: [...q.responses, { id: Date.now().toString(), text: '', isCorrect: false }] }
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
                <div>
                  <div className="text-xs text-slate-500">Step {step.num}</div>
                  <div className={`font-semibold ${currentStep === step.num ? 'text-slate-900' : 'text-slate-600'}`}>
                    {step.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Content Area */}
          <div className="col-span-3">
            {/* Steps Content */}
            {currentStep === 1 && <Step1Identity assessment={assessment} setAssessment={setAssessment} />}
            {currentStep === 2 && <Step2Audience assessment={assessment} setAssessment={setAssessment} totalEmployees={totalEmployees} />}
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
            {currentStep === 4 && <Step4Settings assessment={assessment} setAssessment={setAssessment} totalEmployees={totalEmployees} />}

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
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleDeploy}
                  disabled={loading}
                  className="bg-teal-500 hover:bg-teal-600"
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
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Assessment Title
          </label>
          <input
            type="text"
            value={assessment.title}
            onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
            placeholder="Enter Assessment Title"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Category</label>
            <input
              type="text"
              value={assessment.category}
              onChange={(e) => setAssessment({ ...assessment, category: e.target.value })}
              placeholder="Enter Category"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Priority</label>
            <input
              type="text"
              value={assessment.priority}
              onChange={(e) => setAssessment({ ...assessment, priority: e.target.value })}
              placeholder="Enter Priority"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Internal Description</label>
          <textarea
            value={assessment.description}
            onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
            placeholder="What intelligence are we trying to gather?"
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-700">
          <span className="font-semibold">Caution:</span> Assessments are permanent record points in the Human Risk Profile. Review all questions for clarity and compliance before final deployment.
        </p>
      </div>
    </div>
  );
}

// Step 2: Audience
function Step2Audience({ assessment, setAssessment, totalEmployees }: any) {
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [loadingDepartments, setLoadingDepartments] = React.useState(false);

  React.useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const { employeeAPI } = await import('@/lib/api');

      // Fetch all employees across multiple pages (max page_size is 100)
      let allEmployees: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await employeeAPI.search({ page: currentPage, page_size: 100 });
        allEmployees = [...allEmployees, ...(response.employees || [])];
        totalPages = response.total_pages || 1;
        currentPage++;
      } while (currentPage <= totalPages);

      console.log('Loaded employees:', allEmployees.length);

      // Extract unique departments
      const allDepts = allEmployees
        .map((emp: any) => emp.department)
        .filter(Boolean);

      const uniqueDepts = Array.from(new Set(allDepts)).sort();

      console.log('Unique departments found:', uniqueDepts);
      setDepartments(uniqueDepts as string[]);
    } catch (error) {
      console.error('Failed to load departments:', error);
      console.error('Error details:', error);
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
    {
      id: 'global',
      label: 'Global Deployment',
      description: `Every employee in the organization (${totalEmployees.toLocaleString()})`,
      icon: Target,
    },
    {
      id: 'departmental',
      label: 'Departmental Filter',
      description: 'Select specific teams (Engineering, Finance)',
      icon: Target,
    },
    {
      id: 'risk',
      label: 'Risk Threshold',
      description: 'Target only users with risk score > 68',
      icon: Target,
    },
    {
      id: 'newhires',
      label: 'New Hires',
      description: 'Employees joined in the last 30 days',
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Define Target Audience</h2>
        <p className="text-slate-600 mt-2">
          Who should participate in this assessment?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {audiences.map((aud) => {
          const Icon = aud.icon;
          return (
            <div
              key={aud.id}
              onClick={() => setAssessment({ ...assessment, targetAudience: aud.id })}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                assessment.targetAudience === aud.id
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 hover:border-teal-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  assessment.targetAudience === aud.id ? 'bg-teal-500' : 'bg-teal-100'
                }`}>
                  <Icon className={`w-5 h-5 ${assessment.targetAudience === aud.id ? 'text-white' : 'text-teal-600'}`} />
                </div>
                <div>
                  <div className="font-semibold text-lg text-slate-900 mb-1">{aud.label}</div>
                  <div className="text-sm text-slate-600">{aud.description}</div>
                </div>
              </div>
            </div>
          );
        })}
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
                        : 'border-slate-200 hover:border-teal-300 text-slate-700 bg-white'
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
          <h2 className="text-3xl font-bold text-slate-900">Question Architect</h2>
          <p className="text-slate-600 mt-2">Add and customize questions for your assessment.</p>
        </div>
        <Button onClick={addQuestion} className="bg-teal-500 hover:bg-teal-600 text-white">
          Add Question
        </Button>
      </div>

      {assessment.questions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p>No questions added yet. Click "Add Question" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assessment.questions.map((q: any, index: number) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                {/* Drag Handle */}
                <div className="pt-2">
                  <GripVertical className="w-5 h-5 text-slate-400" />
                </div>

                <div className="flex-1 space-y-4">
                  {/* Index Badge and Delete */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-teal-500 text-white text-xs font-semibold rounded">
                      Index {index + 1}
                    </span>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Question Input */}
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                    placeholder="Type your question prompt here..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 placeholder:text-slate-400"
                  />

                  {/* Response Nodes */}
                  <div>
                    <div className="text-sm font-medium text-slate-900 mb-2">Response Nodes</div>
                    <div className="space-y-2">
                      {q.responses.map((r: any, rIndex: number) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <span className="px-3 py-2 bg-teal-500 text-white text-xs font-semibold rounded">
                            Node {rIndex + 1}
                          </span>
                          <input
                            type="text"
                            value={r.text}
                            onChange={(e) => updateResponse(q.id, r.id, e.target.value)}
                            placeholder={`Option ${rIndex + 1}`}
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 placeholder:text-slate-400"
                          />
                          {q.responses.length > 1 && (
                            <button
                              onClick={() => deleteResponse(q.id, r.id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question Type and Add Response */}
                  <div className="flex items-center justify-between">
                    <select
                      value={q.questionType}
                      onChange={(e) => updateQuestion(q.id, 'questionType', e.target.value)}
                      className="px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600"
                    >
                      <option>Multiple Choice</option>
                      <option>True/False</option>
                      <option>Scenario Based</option>
                      <option>Short Text</option>
                    </select>

                    <button
                      onClick={() => addResponse(q.id)}
                      className="text-teal-500 hover:text-teal-600 font-medium text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> RESPONSE NODE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 4: Settings
function Step4Settings({ assessment, setAssessment, totalEmployees }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Deployment Strategy</h2>
        <p className="text-slate-600 mt-2">
          Fine-tune how this assessment is delivered and monitored across the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Global Time Limit (Minutes)
            </label>
            <input
              type="number"
              value={assessment.timeLimit}
              onChange={(e) => setAssessment({ ...assessment, timeLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600"
            />
          </div>

          <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 cursor-pointer hover:border-teal-300 transition-colors">
            <input
              type="checkbox"
              checked={assessment.randomizeQuestions}
              onChange={(e) => setAssessment({ ...assessment, randomizeQuestions: e.target.checked })}
              className="w-5 h-5 text-teal-500 rounded focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-slate-700">Randomize question order</span>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 cursor-pointer hover:border-teal-300 transition-colors">
            <input
              type="checkbox"
              checked={assessment.allowPauseResume}
              onChange={(e) => setAssessment({ ...assessment, allowPauseResume: e.target.checked })}
              className="w-5 h-5 text-teal-500 rounded focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-slate-700">Allow users to pause & resume</span>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 cursor-pointer hover:border-teal-300 transition-colors">
            <input
              type="checkbox"
              checked={assessment.anonymousResponses}
              onChange={(e) => setAssessment({ ...assessment, anonymousResponses: e.target.checked })}
              className="w-5 h-5 text-teal-500 rounded focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-slate-700">Anonymous responses only</span>
          </label>
        </div>

        {/* Right Side - Mission Ready Card */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6">
            <Send className="w-10 h-10 text-teal-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Mission Ready</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Deployment targets {totalEmployees.toLocaleString()} workforce profiles.
            <br />
            Live intelligence streaming will initialize upon transmission.
          </p>
        </div>
      </div>
    </div>
  );
}
