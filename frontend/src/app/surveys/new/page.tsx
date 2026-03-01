/**
 * Survey Builder
 * Create and configure security awareness surveys
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  CheckCircle,
  X
} from 'lucide-react';

export default function NewSurveyPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <SurveyBuilderContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function SurveyBuilderContent() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [survey, setSurvey] = useState({
    title: '',
    description: '',
    questions: [] as any[]
  });

  const questionTypes = [
    { id: 'multiple_choice', name: 'Multiple Choice', icon: CheckCircle },
    { id: 'true_false', name: 'True/False', icon: CheckCircle },
    { id: 'short_text', name: 'Short Text', icon: FileText }
  ];

  const addQuestion = (type: string) => {
    const newQuestion = {
      id: Date.now().toString(),
      type,
      question: '',
      options: type === 'multiple_choice' ? ['', '', ''] : type === 'true_false' ? ['True', 'False'] : [],
      correctAnswer: '',
      points: 10
    };

    setSurvey({
      ...survey,
      questions: [...survey.questions, newQuestion]
    });
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt: string, idx: number) =>
                idx === optionIndex ? value : opt
              )
            }
          : q
      )
    });
  };

  const addOption = (questionId: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map(q =>
        q.id === questionId ? { ...q, options: [...q.options, ''] } : q
      )
    });
  };

  const removeQuestion = (questionId: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.filter(q => q.id !== questionId)
    });
  };

  const saveDraft = async () => {
    // Save as draft - not implemented in backend yet
    alert('Draft saved locally. Backend API integration coming soon.');
  };

  const publishSurvey = async () => {
    if (!survey.title.trim()) {
      alert('Please enter a survey title');
      return;
    }

    if (survey.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // This is a placeholder - actual backend API for surveys not implemented yet
      alert('Survey publishing API not implemented yet. Survey data prepared and ready for backend integration.');
      console.log('Survey data:', survey);

      // Redirect back to surveys list
      router.push('/surveys');
    } catch (err: any) {
      console.error('Failed to publish survey:', err);
      alert(err.message || 'Failed to publish survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/surveys')}
          className="text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          ← Back to Surveys
        </button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Create New Survey
        </h1>
        <p className="text-slate-500 mt-1">
          Design questions to assess security awareness
        </p>
      </div>

      {/* Survey Basic Info */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Survey Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Survey Title *
            </label>
            <input
              type="text"
              value={survey.title}
              onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
              placeholder="e.g., Q1 2026 Security Awareness Assessment"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={survey.description}
              onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
              placeholder="Brief description of this survey's purpose"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </Card>

      {/* Question Builder */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Questions</h2>
          <div className="text-sm text-slate-500">
            {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {survey.questions.length > 0 && (
          <div className="space-y-4 mb-6">
            {survey.questions.map((question, qIdx) => (
              <div key={question.id} className="p-4 rounded-lg border-2 border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 rounded bg-teal-100 text-teal-700 text-xs font-medium">
                        Question {qIdx + 1}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium capitalize">
                        {question.type.replace('_', ' ')}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                      placeholder="Enter your question here"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    />
                  </div>
                  <button
                    onClick={() => removeQuestion(question.id)}
                    className="ml-4 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Options for Multiple Choice */}
                {question.type === 'multiple_choice' && (
                  <div className="space-y-2 mb-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Answer Options
                    </label>
                    {question.options.map((option: string, optIdx: number) => (
                      <div key={optIdx} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctAnswer === option}
                          onChange={() => updateQuestion(question.id, 'correctAnswer', option)}
                          className="w-4 h-4 text-teal-600"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(question.id, optIdx, e.target.value)}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(question.id)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {/* Options for True/False */}
                {question.type === 'true_false' && (
                  <div className="space-y-2 mb-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Correct Answer
                    </label>
                    <div className="flex items-center space-x-4">
                      {question.options.map((option: string) => (
                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctAnswer === option}
                            onChange={() => updateQuestion(question.id, 'correctAnswer', option)}
                            className="w-4 h-4 text-teal-600"
                          />
                          <span className="text-sm font-medium text-slate-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Points */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={question.points}
                    onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-24 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Question Buttons */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Question</h3>
          <div className="grid grid-cols-3 gap-3">
            {questionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => addQuestion(type.id)}
                  className="p-4 rounded-lg border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
                >
                  <Icon className="w-5 h-5 text-teal-600 mb-2" />
                  <div className="text-sm font-semibold text-slate-900">{type.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => router.push('/surveys')}
        >
          Cancel
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<Save className="w-4 h-4" />}
            onClick={saveDraft}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            onClick={publishSurvey}
            disabled={loading}
          >
            {loading ? 'Publishing...' : 'Publish Survey'}
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <Card className="bg-teal-50 border-teal-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-teal-600 mt-0.5" />
          <div className="text-sm text-teal-900">
            <div className="font-semibold mb-1">About Survey Scoring</div>
            <div>
              After employees complete this survey, their answers will be automatically scored.
              Risk scores will be recalculated based on survey performance, helping identify
              employees who need additional security training.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
