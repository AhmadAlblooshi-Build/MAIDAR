/**
 * API Client for MAIDAR Backend
 *
 * Handles all HTTP requests with authentication and error handling
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type {
  User,
  LoginResponse,
  Employee,
  EmployeeSearchResponse,
  EmployeeStatistics,
  Scenario,
  ScenarioSearchResponse,
  Simulation,
  SimulationSearchResponse,
  SimulationResult,
  SimulationStatistics,
  RiskScore,
  RiskDistribution,
  ExecutiveSummary,
  ApiError,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Generic API call function
export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await api.request<T>({
      method,
      url: endpoint,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = {
        detail: error.response?.data?.detail || error.message,
        status: error.response?.status || 500,
      };
      throw apiError;
    }
    throw error;
  }
}

// Authentication API
export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    organization_name?: string;
  }) => apiCall('POST', '/auth/register', data),

  login: (email: string, password: string) =>
    apiCall<LoginResponse>('POST', '/auth/login', { email, password }),

  verifyEmail: (token: string, code?: string) =>
    apiCall('POST', '/auth/verify-email', { token, code }),

  forgotPassword: (email: string) =>
    apiCall('POST', '/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    apiCall('POST', '/auth/reset-password', { token, new_password }),

  getMe: () => apiCall('GET', '/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    apiCall('POST', '/auth/change-password', { current_password, new_password }),
};

// Employee API
export const employeeAPI = {
  create: (data: Partial<Employee>) => apiCall<Employee>('POST', '/employees/', data),
  get: (id: string) => apiCall<Employee>('GET', `/employees/${id}`),
  update: (id: string, data: Partial<Employee>) => apiCall<Employee>('PUT', `/employees/${id}`, data),
  delete: (id: string) => apiCall<void>('DELETE', `/employees/${id}`),
  search: (filters: any) => apiCall<EmployeeSearchResponse>('POST', '/employees/search', filters),
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiCall('POST', '/employees/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  statistics: () => apiCall<EmployeeStatistics>('GET', '/employees/statistics'),
};

// Scenario API
export const scenarioAPI = {
  create: (data: any) => apiCall('POST', '/scenarios/', data),
  get: (id: string) => apiCall('GET', `/scenarios/${id}`),
  update: (id: string, data: any) => apiCall('PUT', `/scenarios/${id}`, data),
  delete: (id: string) => apiCall('DELETE', `/scenarios/${id}`),
  search: (filters: any) => apiCall('POST', '/scenarios/search', filters),
  statistics: () => apiCall('GET', '/scenarios/statistics'),
};

// Simulation API
export const simulationAPI = {
  create: (data: any) => apiCall<Simulation>('POST', '/simulations/', data),
  get: (id: string) => apiCall<Simulation>('GET', `/simulations/${id}`),
  update: (id: string, data: any) => apiCall<Simulation>('PUT', `/simulations/${id}`, data),
  delete: (id: string) => apiCall<void>('DELETE', `/simulations/${id}`),
  search: (filters: any) => apiCall<SimulationSearchResponse>('POST', '/simulations/search', filters),
  launch: (id: string, data: any) => apiCall<any>('POST', `/simulations/${id}/launch`, data),
  getResults: (id: string, page: number = 1, pageSize: number = 50) =>
    apiCall('GET', `/simulations/${id}/results?page=${page}&page_size=${pageSize}`),
  getStatistics: (id: string) => apiCall('GET', `/simulations/${id}/statistics`),
};

// Analytics API
export const analyticsAPI = {
  getRiskTrends: (start_date: string, end_date: string) =>
    apiCall('POST', '/analytics/risk-trends', { start_date, end_date }),
  getDepartmentComparison: () => apiCall('GET', '/analytics/department-comparison'),
  getSeniorityComparison: () => apiCall('GET', '/analytics/seniority-comparison'),
  getTopVulnerable: (limit: number = 10) =>
    apiCall('GET', `/analytics/top-vulnerable?limit=${limit}`),
  getRiskDistribution: () => apiCall<RiskDistribution>('GET', '/analytics/risk-distribution'),
  getExecutiveSummary: (start_date?: string, end_date?: string) => {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    return apiCall<ExecutiveSummary>('GET', `/analytics/executive-summary?${params.toString()}`);
  },
  export: (data: any) => apiCall<any>('POST', '/analytics/export', data),
};

// Tenant Management API (Super Admin)
export const tenantAPI = {
  create: (data: any) => apiCall('POST', '/tenants/', data),
  get: (id: string) => apiCall('GET', `/tenants/${id}`),
  update: (id: string, data: any) => apiCall('PUT', `/tenants/${id}`, data),
  delete: (id: string) => apiCall('DELETE', `/tenants/${id}`),
  search: (filters: any) => apiCall('POST', '/tenants/search', filters),
  suspend: (id: string) => apiCall('POST', `/tenants/${id}/suspend`),
  activate: (id: string) => apiCall('POST', `/tenants/${id}/activate`),
};

// Admin Users API (Super Admin)
export const adminUserAPI = {
  create: (data: any) => apiCall('POST', '/admin-users/', data),
  get: (id: string) => apiCall('GET', `/admin-users/${id}`),
  update: (id: string, data: any) => apiCall('PUT', `/admin-users/${id}`, data),
  search: (filters: any) => apiCall('POST', '/admin-users/search', filters),
  suspend: (id: string) => apiCall('POST', `/admin-users/${id}/suspend`),
  activate: (id: string) => apiCall('POST', `/admin-users/${id}/activate`),
  reassignTenant: (id: string, tenantId: string) =>
    apiCall('PUT', `/admin-users/${id}/reassign-tenant`, { new_tenant_id: tenantId }),
};

// Audit Logs API (Super Admin)
export const auditLogAPI = {
  search: (filters: any) => apiCall('POST', '/audit-logs/search', filters),
  get: (id: string) => apiCall('GET', `/audit-logs/${id}`),
};

export default api;
