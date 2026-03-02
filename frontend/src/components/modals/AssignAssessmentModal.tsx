/**
 * Assign Assessment Modal
 * Allows assigning multiple assessments to a specific employee
 */

'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import assessmentAPI from '@/lib/api/assessment';
import { Check, Calendar, AlertTriangle } from 'lucide-react';

interface AssignAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    full_name: string;
  };
  onSuccess: () => void;
}

export default function AssignAssessmentModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: AssignAssessmentModalProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [riskPriority, setRiskPriority] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAssessments();
      // Set default due date to 7 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.setDate(defaultDate.getDate() + 7));
      setDueDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const loadAssessments = async () => {
    try {
      setLoadingAssessments(true);
      const response = await assessmentAPI.list({
        page: 1,
        page_size: 100,
        status: 'active', // Only show active assessments
      });
      setAssessments(response.assessments || []);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const toggleAssessment = (assessmentId: string) => {
    if (selectedAssessments.includes(assessmentId)) {
      setSelectedAssessments(selectedAssessments.filter((id) => id !== assessmentId));
    } else {
      setSelectedAssessments([...selectedAssessments, assessmentId]);
    }
  };

  const handleConfirm = async () => {
    if (selectedAssessments.length === 0) {
      alert('Please select at least one assessment');
      return;
    }

    if (!dueDate) {
      alert('Please select a due date');
      return;
    }

    try {
      setLoading(true);

      // Call backend API to assign assessments
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://maidar-production-3ee1.up.railway.app'}/api/v1/employees/${employee.id}/assign-assessments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            assessment_ids: selectedAssessments,
            due_date: dueDate,
            risk_priority: riskPriority,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to assign assessments');
      }

      alert(
        `Successfully assigned ${selectedAssessments.length} assessment(s) to ${employee.full_name}`
      );
      setSelectedAssessments([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to assign assessments:', error);
      alert('Failed to assign assessments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (assessment: any) => {
    // Determine badge color based on category or title
    const title = assessment.title?.toLowerCase() || '';
    const category = assessment.category?.toLowerCase() || '';

    if (title.includes('phishing') || category.includes('phishing')) {
      return { label: 'SIMULATIONS', color: 'bg-blue-100 text-blue-700' };
    } else if (
      title.includes('advanced') ||
      category.includes('advanced') ||
      category.includes('security')
    ) {
      return { label: 'ADVANCED', color: 'bg-purple-100 text-purple-700' };
    } else if (title.includes('password') || title.includes('hygiene')) {
      return { label: 'BEHAVIORAL', color: 'bg-orange-100 text-orange-700' };
    } else if (title.includes('remote') || title.includes('work')) {
      return { label: 'REMOTE', color: 'bg-teal-100 text-teal-700' };
    }

    return { label: 'GENERAL', color: 'bg-slate-100 text-slate-700' };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Assessment" size="lg">
      <div className="p-6">
        {/* Subtitle */}
        <p className="text-sm text-slate-500 mb-6">
          Select multiple assessments for {employee.full_name}
        </p>

        {/* Assessment List */}
        <div className="mb-6 max-h-80 overflow-y-auto">
          {loadingAssessments ? (
            <div className="text-center py-8 text-slate-500">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No active assessments available</p>
              <p className="text-sm mt-1">Create an assessment first to assign it to employees</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => {
                const isSelected = selectedAssessments.includes(assessment.id);
                const badge = getCategoryBadge(assessment);

                return (
                  <button
                    key={assessment.id}
                    onClick={() => toggleAssessment(assessment.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-teal-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 mb-1">
                          {assessment.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                            {assessment.question_count || 0} items
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Due Date and Risk Priority */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Risk Priority</label>
            <select
              value={riskPriority}
              onChange={(e) => setRiskPriority(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="low">Low Priority</option>
              <option value="standard">Standard Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || selectedAssessments.length === 0}
            className="bg-teal-500 hover:bg-teal-600"
          >
            {loading ? 'Assigning...' : 'Confirm Deployment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
