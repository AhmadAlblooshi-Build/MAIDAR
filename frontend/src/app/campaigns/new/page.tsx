/**
 * Campaign Creation Wizard (4-Step Flow)
 * Step 1: Select campaign type
 * Step 2: Audience selection
 * Step 3: Content configuration
 * Step 4: Review & confirm
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Target,
  Users,
  Mail,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Send
} from 'lucide-react';

export default function NewCampaignPage() {
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
  const searchParams = useSearchParams();
  const { token } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);

  // Campaign data
  const [campaignData, setCampaignData] = useState({
    // Step 1: Campaign Type
    name: '',
    type: 'phishing', // phishing, awareness, training
    description: '',

    // Step 2: Audience
    targetEmployees: [] as string[],
    targetDepartments: [] as string[],
    targetRiskLevels: [] as string[],
    sendToAll: false,

    // Step 3: Content
    scenario_id: '',
    customSubject: '',
    customBody: '',
    trackOpens: true,
    trackClicks: true,
    trackCredentials: true,

    // Step 4: Schedule
    sendImmediately: true,
    scheduledDate: '',
    scheduledTime: ''
  });

  useEffect(() => {
    loadWizardData();
    // Pre-select employee if coming from employee profile
    const employeeId = searchParams.get('employee');
    if (employeeId) {
      setCampaignData(prev => ({
        ...prev,
        targetEmployees: [employeeId]
      }));
    }
  }, []);

  const loadWizardData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Load employees, scenarios in parallel
      const [employeesRes, scenariosRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/employees/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page: 1, page_size: 1000 })
        }),
        fetch(`${apiUrl}/api/v1/scenarios/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page: 1, page_size: 100 })
        })
      ]);

      const employeesData = await employeesRes.json();
      const scenariosData = await scenariosRes.json();

      setEmployees(employeesData.items || []);
      setScenarios(scenariosData.items || []);

      // Extract unique departments
      const depts = [...new Set(employeesData.items?.map((e: any) => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load wizard data:', err);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Build target employees list
      let targetEmployees = [...campaignData.targetEmployees];

      // Add employees by department
      if (campaignData.targetDepartments.length > 0) {
        const deptEmployees = employees
          .filter(e => campaignData.targetDepartments.includes(e.department))
          .map(e => e.id);
        targetEmployees = [...new Set([...targetEmployees, ...deptEmployees])];
      }

      // Add employees by risk level
      if (campaignData.targetRiskLevels.length > 0) {
        const riskEmployees = employees
          .filter(e => campaignData.targetRiskLevels.includes(e.risk_band))
          .map(e => e.id);
        targetEmployees = [...new Set([...targetEmployees, ...riskEmployees])];
      }

      // Send to all if selected
      if (campaignData.sendToAll) {
        targetEmployees = employees.map(e => e.id);
      }

      const payload = {
        name: campaignData.name,
        description: campaignData.description || `${campaignData.type} campaign`,
        scenario_id: campaignData.scenario_id,
        target_employee_ids: targetEmployees,
        send_immediately: campaignData.sendImmediately,
        scheduled_send_time: campaignData.sendImmediately ? null : `${campaignData.scheduledDate}T${campaignData.scheduledTime}:00Z`,
        track_opens: campaignData.trackOpens,
        track_clicks: campaignData.trackClicks,
        track_credentials: campaignData.trackCredentials
      };

      const response = await fetch(`${apiUrl}/api/v1/simulations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create campaign');
      }

      const newCampaign = await response.json();

      // Redirect to campaign status page
      router.push(`/campaigns/${newCampaign.id}`);
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      alert(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return campaignData.name.trim() !== '' && campaignData.type !== '';
      case 2:
        return campaignData.sendToAll ||
               campaignData.targetEmployees.length > 0 ||
               campaignData.targetDepartments.length > 0 ||
               campaignData.targetRiskLevels.length > 0;
      case 3:
        return campaignData.scenario_id !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const getTargetCount = () => {
    if (campaignData.sendToAll) return employees.length;

    let targetIds = new Set([...campaignData.targetEmployees]);

    campaignData.targetDepartments.forEach(dept => {
      employees
        .filter(e => e.department === dept)
        .forEach(e => targetIds.add(e.id));
    });

    campaignData.targetRiskLevels.forEach(risk => {
      employees
        .filter(e => e.risk_band === risk)
        .forEach(e => targetIds.add(e.id));
    });

    return targetIds.size;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/campaigns')}
          className="text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          ← Back to Campaigns
        </button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Create New Campaign
        </h1>
        <p className="text-slate-500 mt-1">
          Follow the steps to create and launch your campaign
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[
          { num: 1, label: 'Campaign Type', icon: Target },
          { num: 2, label: 'Select Audience', icon: Users },
          { num: 3, label: 'Configure Content', icon: Mail },
          { num: 4, label: 'Review & Launch', icon: CheckCircle }
        ].map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;

          return (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <div>
                  <div className={`text-xs ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
                    Step {step.num}
                  </div>
                  <div className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                    {step.label}
                  </div>
                </div>
              </div>
              {idx < 3 && (
                <div className={`flex-1 h-1 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="p-8">
        {currentStep === 1 && (
          <Step1CampaignType
            campaignData={campaignData}
            setCampaignData={setCampaignData}
          />
        )}
        {currentStep === 2 && (
          <Step2Audience
            campaignData={campaignData}
            setCampaignData={setCampaignData}
            employees={employees}
            departments={departments}
          />
        )}
        {currentStep === 3 && (
          <Step3Content
            campaignData={campaignData}
            setCampaignData={setCampaignData}
            scenarios={scenarios}
          />
        )}
        {currentStep === 4 && (
          <Step4Review
            campaignData={campaignData}
            targetCount={getTargetCount()}
            scenarios={scenarios}
          />
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={currentStep === 1}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>

        <div className="text-sm text-slate-500">
          Step {currentStep} of 4
        </div>

        {currentStep < 4 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!isStepValid()}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Next Step
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !isStepValid()}
            icon={<Send className="w-4 h-4" />}
          >
            {loading ? 'Creating...' : 'Launch Campaign'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Step 1: Campaign Type
function Step1CampaignType({ campaignData, setCampaignData }: any) {
  const campaignTypes = [
    {
      id: 'phishing',
      name: 'Phishing Simulation',
      description: 'Test employee awareness with realistic phishing emails',
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-600'
    },
    {
      id: 'awareness',
      name: 'Security Awareness',
      description: 'Educational content to improve security knowledge',
      icon: Target,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'training',
      name: 'Training Campaign',
      description: 'Interactive security training modules',
      icon: Users,
      color: 'from-purple-500 to-pink-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Campaign Type</h2>
        <p className="text-slate-600">Choose the type of campaign you want to run</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {campaignTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = campaignData.type === type.id;

          return (
            <div
              key={type.id}
              onClick={() => setCampaignData({ ...campaignData, type: type.id })}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-50 shadow-lg'
                  : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{type.name}</h3>
              <p className="text-sm text-slate-600">{type.description}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Campaign Name *
          </label>
          <input
            type="text"
            value={campaignData.name}
            onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
            placeholder="e.g., Q1 2026 Phishing Test"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={campaignData.description}
            onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
            placeholder="Brief description of this campaign's purpose"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Audience Selection
function Step2Audience({ campaignData, setCampaignData, employees, departments }: any) {
  const riskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const toggleEmployee = (employeeId: string) => {
    const newTargets = campaignData.targetEmployees.includes(employeeId)
      ? campaignData.targetEmployees.filter((id: string) => id !== employeeId)
      : [...campaignData.targetEmployees, employeeId];

    setCampaignData({ ...campaignData, targetEmployees: newTargets, sendToAll: false });
  };

  const toggleDepartment = (dept: string) => {
    const newDepts = campaignData.targetDepartments.includes(dept)
      ? campaignData.targetDepartments.filter((d: string) => d !== dept)
      : [...campaignData.targetDepartments, dept];

    setCampaignData({ ...campaignData, targetDepartments: newDepts, sendToAll: false });
  };

  const toggleRiskLevel = (risk: string) => {
    const newRisks = campaignData.targetRiskLevels.includes(risk)
      ? campaignData.targetRiskLevels.filter((r: string) => r !== risk)
      : [...campaignData.targetRiskLevels, risk];

    setCampaignData({ ...campaignData, targetRiskLevels: newRisks, sendToAll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Target Audience</h2>
        <p className="text-slate-600">Choose who will receive this campaign</p>
      </div>

      {/* Send to All */}
      <div className="p-4 rounded-lg border-2 border-slate-200">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={campaignData.sendToAll}
            onChange={(e) => setCampaignData({ ...campaignData, sendToAll: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <div className="font-semibold text-slate-900">Send to All Employees</div>
            <div className="text-sm text-slate-500">Target all {employees.length} employees in your organization</div>
          </div>
        </label>
      </div>

      {!campaignData.sendToAll && (
        <>
          {/* Filter by Department */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">By Department</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map((dept: string) => (
                <button
                  key={dept}
                  onClick={() => toggleDepartment(dept)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    campaignData.targetDepartments.includes(dept)
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-700 hover:border-teal-300'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Filter by Risk Level */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">By Risk Level</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {riskLevels.map((risk) => (
                <button
                  key={risk}
                  onClick={() => toggleRiskLevel(risk)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    campaignData.targetRiskLevels.includes(risk)
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-700 hover:border-teal-300'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>

          {/* Individual Employees */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Individual Employees</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-4">
              {employees.slice(0, 50).map((employee: any) => (
                <label key={employee.id} className="flex items-center space-x-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignData.targetEmployees.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{employee.full_name}</div>
                    <div className="text-xs text-slate-500">{employee.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Step 3: Content Configuration
function Step3Content({ campaignData, setCampaignData, scenarios }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Configure Campaign Content</h2>
        <p className="text-slate-600">Select a scenario template or customize your content</p>
      </div>

      {/* Select Scenario */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Select Scenario Template *
        </label>
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {scenarios.length > 0 ? (
            scenarios.map((scenario: any) => (
              <div
                key={scenario.id}
                onClick={() => setCampaignData({ ...campaignData, scenario_id: scenario.id })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  campaignData.scenario_id === scenario.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{scenario.name}</h4>
                    <p className="text-sm text-slate-600">{scenario.description}</p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-slate-500">
                      <span>Difficulty: {scenario.difficulty}</span>
                      <span>•</span>
                      <span>Category: {scenario.category}</span>
                    </div>
                  </div>
                  {campaignData.scenario_id === scenario.id && (
                    <CheckCircle className="w-6 h-6 text-teal-600" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              No scenarios available. Please create scenarios first.
            </div>
          )}
        </div>
      </div>

      {/* Tracking Options */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Tracking Options</h3>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={campaignData.trackOpens}
            onChange={(e) => setCampaignData({ ...campaignData, trackOpens: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Track Email Opens</div>
            <div className="text-xs text-slate-500">Monitor when recipients open the email</div>
          </div>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={campaignData.trackClicks}
            onChange={(e) => setCampaignData({ ...campaignData, trackClicks: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Track Link Clicks</div>
            <div className="text-xs text-slate-500">Monitor when recipients click links in the email</div>
          </div>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={campaignData.trackCredentials}
            onChange={(e) => setCampaignData({ ...campaignData, trackCredentials: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Track Credential Submission</div>
            <div className="text-xs text-slate-500">Monitor if recipients submit credentials on landing page</div>
          </div>
        </label>
      </div>

      {/* Schedule */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Schedule</h3>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            checked={campaignData.sendImmediately}
            onChange={() => setCampaignData({ ...campaignData, sendImmediately: true })}
            className="w-4 h-4 border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Send Immediately</div>
            <div className="text-xs text-slate-500">Campaign will start as soon as you launch it</div>
          </div>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            checked={!campaignData.sendImmediately}
            onChange={() => setCampaignData({ ...campaignData, sendImmediately: false })}
            className="w-4 h-4 border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">Schedule for Later</div>
            {!campaignData.sendImmediately && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <input
                  type="date"
                  value={campaignData.scheduledDate}
                  onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <input
                  type="time"
                  value={campaignData.scheduledTime}
                  onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

// Step 4: Review & Confirm
function Step4Review({ campaignData, targetCount, scenarios }: any) {
  const selectedScenario = scenarios.find((s: any) => s.id === campaignData.scenario_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Review & Launch Campaign</h2>
        <p className="text-slate-600">Review your campaign configuration before launching</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-1">Campaign Name</div>
          <div className="text-slate-900">{campaignData.name}</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-1">Campaign Type</div>
          <div className="text-slate-900 capitalize">{campaignData.type}</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-1">Target Audience</div>
          <div className="text-slate-900">{targetCount} employees</div>
          {campaignData.targetDepartments.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              Departments: {campaignData.targetDepartments.join(', ')}
            </div>
          )}
          {campaignData.targetRiskLevels.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              Risk Levels: {campaignData.targetRiskLevels.join(', ')}
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-1">Scenario</div>
          <div className="text-slate-900">{selectedScenario?.name || 'N/A'}</div>
          {selectedScenario?.description && (
            <div className="text-xs text-slate-500 mt-1">{selectedScenario.description}</div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-1">Schedule</div>
          <div className="text-slate-900">
            {campaignData.sendImmediately
              ? 'Send Immediately'
              : `Scheduled for ${campaignData.scheduledDate} at ${campaignData.scheduledTime}`}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-2">Tracking Enabled</div>
          <div className="flex flex-wrap gap-2">
            {campaignData.trackOpens && (
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                Email Opens
              </span>
            )}
            {campaignData.trackClicks && (
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                Link Clicks
              </span>
            )}
            {campaignData.trackCredentials && (
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                Credential Submission
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-teal-600 mt-0.5" />
          <div className="text-sm text-teal-900">
            <div className="font-semibold mb-1">Ready to Launch</div>
            <div>
              This campaign will be sent to {targetCount} employees. Make sure you've reviewed all settings carefully before proceeding.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
