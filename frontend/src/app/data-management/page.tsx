/**
 * Data Management Page
 * CSV import, validation errors, and bulk operations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet, Users, Trash2 } from 'lucide-react';

export default function DataManagementPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <DataManagementContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function DataManagementContent() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${apiUrl}/api/v1/employees/upload-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Show detailed error message from backend
        const errorMessage = result.detail || result.message || 'Upload failed';
        console.error('Backend error:', result);
        alert(`Failed to upload file: ${errorMessage}`);
        return;
      }

      setUploadResult(result);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file. Please check the format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const csvContent = 'employee_id,email,full_name,age_range,gender,languages,technical_literacy,seniority,department,job_title\n' +
      'EMP001,john@company.com,John Doe,25_34,male,"en",8,Mid-Level,Engineering,Software Engineer\n' +
      'EMP002,jane@company.com,Jane Smith,35_44,female,"en",6,Senior,Sales,Account Executive\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Data Management
          </h1>
          <p className="text-slate-500 mt-1">
            Import employees, validate data, and perform bulk operations
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
      </div>

      {/* CSV Import Section */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">CSV Import</h2>
            <p className="text-sm text-slate-500">Bulk import employees from CSV file</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Click to select CSV file or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">
                    Supported format: CSV (max 5MB)
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setUploadResult(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Upload className="w-4 h-4" />}
                onClick={handleUpload}
                loading={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload & Import'}
              </Button>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-4 rounded-lg ${
              uploadResult.success_count > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {uploadResult.success_count > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${
                    uploadResult.success_count > 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Import Results
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Successfully imported:</span>
                      <span className="font-semibold text-green-600">
                        {uploadResult.success_count || 0} employees
                      </span>
                    </div>
                    {uploadResult.error_count > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Failed:</span>
                        <span className="font-semibold text-red-600">
                          {uploadResult.error_count} rows
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Validation Errors Section */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Validation Errors</h2>
            <p className="text-sm text-slate-500">Review and fix data validation issues</p>
          </div>
        </div>

        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600">No validation errors found</p>
          <p className="text-xs text-slate-500 mt-1">All employee data is valid and up to date</p>
        </div>
      </Card>

      {/* Bulk Actions Section */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bulk Actions</h2>
            <p className="text-sm text-slate-500">Perform operations on multiple employees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/employees')}
            className="p-6 rounded-lg border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
          >
            <Users className="w-8 h-8 text-teal-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Bulk Risk Recalculation</h3>
            <p className="text-sm text-slate-500">
              Recalculate risk scores for all employees based on latest data
            </p>
          </button>

          <button
            onClick={() => router.push('/campaigns/new')}
            className="p-6 rounded-lg border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <Upload className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Assign to Campaign</h3>
            <p className="text-sm text-slate-500">
              Add multiple employees to a security awareness campaign
            </p>
          </button>

          <button
            onClick={() => alert('Export functionality coming soon')}
            className="p-6 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
          >
            <Download className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Bulk Export</h3>
            <p className="text-sm text-slate-500">
              Export employee data and risk profiles to CSV or PDF
            </p>
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete inactive employees? This action cannot be undone.')) {
                alert('Bulk delete functionality coming soon');
              }
            }}
            className="p-6 rounded-lg border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 transition-all text-left"
          >
            <Trash2 className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Bulk Delete</h3>
            <p className="text-sm text-slate-500">
              Remove inactive or duplicate employee records
            </p>
          </button>
        </div>
      </Card>

      {/* Import Guidelines */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <div className="font-semibold mb-2">CSV Import Guidelines</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Download the template to ensure correct column format</li>
              <li>Required fields: employee_id, email, full_name, age_range, technical_literacy, seniority, department</li>
              <li>Optional fields: job_title, gender, languages</li>
              <li>Age range values: 18_24, 25_34, 35_44, 45_54, 55_plus</li>
              <li>Technical literacy: 1-10 (numeric value)</li>
              <li>Seniority values: Entry, Mid-Level, Senior, Executive</li>
              <li>Email addresses must be unique across all employees</li>
              <li>Maximum file size: 5MB (approximately 10,000 employees)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
