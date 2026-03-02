/**
 * Assessment API Client
 * Handles all API calls for risk assessments
 */

import { api } from '../api';

export interface QuestionResponse {
  response_text: string;
  is_correct?: boolean;
  order_index: number;
}

export interface Question {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'scenario_based' | 'short_text';
  order_index: number;
  responses: QuestionResponse[];
}

export interface AssessmentCreateRequest {
  title: string;
  category?: string;
  priority?: string;
  description?: string;
  target_audience: 'global' | 'departmental' | 'risk' | 'newhires';
  time_limit?: number;
  randomize_questions: boolean;
  allow_pause_resume: boolean;
  anonymous_responses: boolean;
  questions: Question[];
}

export interface Assessment {
  id: string;
  tenant_id: string;
  created_by?: string;
  title: string;
  category?: string;
  priority?: string;
  description?: string;
  target_audience: string;
  time_limit?: number;
  randomize_questions: boolean;
  allow_pause_resume: boolean;
  anonymous_responses: boolean;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  deployed_at?: string;
  questions: any[];
}

export interface AssessmentListItem {
  id: string;
  title: string;
  category?: string;
  priority?: string;
  target_audience: string;
  status: string;
  created_at: string;
  deployed_at?: string;
  question_count: number;
  participant_count: number;
}

export interface AssessmentListResponse {
  assessments: AssessmentListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const assessmentAPI = {
  /**
   * Create a new assessment
   */
  create: async (data: AssessmentCreateRequest): Promise<Assessment> => {
    const response = await api.post('/assessments', data);
    return response.data;
  },

  /**
   * List all assessments with pagination and filters
   */
  list: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    target_audience?: string;
    search?: string;
  }): Promise<AssessmentListResponse> => {
    const response = await api.get('/assessments', { params });
    return response.data;
  },

  /**
   * Get a specific assessment by ID
   */
  get: async (id: string): Promise<Assessment> => {
    const response = await api.get(`/assessments/${id}`);
    return response.data;
  },

  /**
   * Update an assessment
   */
  update: async (id: string, data: Partial<AssessmentCreateRequest>): Promise<Assessment> => {
    const response = await api.patch(`/assessments/${id}`, data);
    return response.data;
  },

  /**
   * Deploy an assessment (make it active)
   */
  deploy: async (id: string): Promise<Assessment> => {
    const response = await api.post(`/assessments/${id}/deploy`);
    return response.data;
  },

  /**
   * Delete an assessment
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/assessments/${id}`);
  },

  /**
   * Get results for an assessment
   */
  getResults: async (id: string, params?: {
    page?: number;
    page_size?: number;
  }): Promise<any> => {
    const response = await api.get(`/assessments/${id}/results`, { params });
    return response.data;
  },
};

export default assessmentAPI;
