/**
 * Campaigns Page
 * Manage phishing simulations and security awareness campaigns
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { simulationAPI } from '@/lib/api';
import Card, { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { Target, Users, Activity, TrendingUp, Plus, PlayCircle, BarChart3, Clock, Search, ChevronRight, Info } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <CampaignsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function CampaignsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSimulations();
  }, []);

  const loadSimulations = async () => {
    try {
      setLoading(true);
      const response = await simulationAPI.search({ page: 1, page_size: 100 });
      setSimulations(response.simulations || []);
    } catch (error) {
      console.error('Failed to load simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  const activeCount = simulations.filter(s => s.status === 'in_progress').length;
  const completedCount = simulations.filter(s => s.status === 'completed').length;

  // Calculate average resilience (percentage who identified and reported threats)
  const avgResilience = simulations.length > 0
    ? (simulations.reduce((sum, s) => {
        const reportedRate = s.total_targets > 0 ? (s.reported_count / s.total_targets * 100) : 0;
        return sum + reportedRate;
      }, 0) / simulations.length)
    : 0;

  // Calculate risk delta (mock for now - would need historical data)
  const riskDelta = -18.4;

  // Filter simulations based on search query
  const filteredSimulations = simulations.filter(sim =>
    sim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sim.scenario_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold text-slate-900">
            Phishing Simulations
          </h1>
          <p className="text-slate-500 mt-1">
            Personalized simulations powered by AI to measure behavioral resilience.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/campaigns/new')}
        >
          New Simulation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Simulations Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Active Simulations</h3>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mb-4">
            <div className="text-4xl font-bold text-slate-900">{activeCount}</div>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Number of security simulations currently running in the organization.
          </p>
          <div className="flex items-center space-x-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">1.20%</span>
            <span className="text-slate-500">since last year</span>
          </div>
        </Card>

        {/* Avg Resilience Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Avg Resilience</h3>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mb-4">
            <div className="text-4xl font-bold text-slate-900">{avgResilience.toFixed(0)}</div>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            The average percentage of employees who successfully identified and reported simulation threats.
          </p>
          <div className="flex items-center space-x-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">1.20%</span>
            <span className="text-slate-500">since last year</span>
          </div>
        </Card>

        {/* Risk Delta Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Risk Delta</h3>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mb-4">
            <div className="text-4xl font-bold text-slate-900">{riskDelta}%</div>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            The change in overall risk score since the launch of these simulations.
          </p>
          <div className="flex items-center space-x-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">1.20%</span>
            <span className="text-slate-500">since last year</span>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search Simulations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all bg-white text-slate-900"
        />
      </div>

      {simulations.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-teal-400 rounded-full blur-2xl opacity-20" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100">
              <Target className="w-16 h-16 text-teal-600" />
            </div>
          </div>
          <p className="text-lg font-semibold text-slate-700 mb-2">No simulations found</p>
          <p className="text-slate-500 mb-6">Create your first phishing simulation campaign</p>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push('/simulations/new')}
          >
            Create Simulation
          </Button>
        </Card>
      ) : filteredSimulations.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-teal-400 rounded-full blur-2xl opacity-20" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100">
              <Search className="w-16 h-16 text-teal-600" />
            </div>
          </div>
          <p className="text-lg font-semibold text-slate-700 mb-2">No simulations found</p>
          <p className="text-slate-500 mb-6">Try adjusting your search query</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSimulations.map((sim) => (
            <SimulationCard
              key={sim.id}
              simulation={sim}
              onClick={() => router.push(`/campaigns/${sim.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SimulationCard({ simulation, onClick }: { simulation: any; onClick: () => void }) {
  const getStatusBadge = () => {
    const status = simulation.status;
    if (status === 'completed') return { text: 'Completed', color: 'text-green-600 bg-green-50' };
    if (status === 'in_progress') return { text: 'Active', color: 'text-teal-600 bg-teal-50' };
    if (status === 'scheduled') return { text: 'Scheduled', color: 'text-blue-600 bg-blue-50' };
    return { text: 'Draft', color: 'text-slate-600 bg-slate-50' };
  };

  const getSimulationType = () => {
    // Determine type based on simulation data
    if (simulation.scenario_name?.includes('Individual')) return 'Individualized';
    if (simulation.scenario_name?.includes('Department')) return 'Departmental';
    return 'AI Tailored';
  };

  const interactionRate = simulation.total_targets > 0
    ? ((simulation.clicked_count / simulation.total_targets) * 100).toFixed(1)
    : 0;

  const statusBadge = getStatusBadge();

  return (
    <Card hover onClick={onClick} className="cursor-pointer">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4 flex-1">
          {/* Icon */}
          <div className="p-3 rounded-full bg-teal-50">
            <Target className="w-6 h-6 text-teal-600" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="font-semibold text-slate-900">{simulation.name}</h3>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className={`px-2 py-1 rounded font-medium ${statusBadge.color}`}>
                {statusBadge.text}
              </span>
              <span className="text-slate-600">{getSimulationType()}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{simulation.total_targets} Participants</span>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{interactionRate}%</div>
            <div className="text-sm text-slate-500">Interaction Rate</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </Card>
  );
}
