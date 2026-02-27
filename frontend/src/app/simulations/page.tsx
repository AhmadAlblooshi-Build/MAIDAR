/**
 * Risk Simulations Page
 * Personalized simulations powered by AI to measure behavioral resilience
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
import { Target, Users, Activity, TrendingUp, Plus, PlayCircle, BarChart3, Clock } from 'lucide-react';

export default function SimulationsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <SimulationsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function SimulationsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState<any[]>([]);

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
    return <Spinner fullScreen />;
  }

  const activeCount = simulations.filter(s => s.status === 'in_progress').length;
  const completedCount = simulations.filter(s => s.status === 'completed').length;
  const avgResilience = simulations.length > 0
    ? (simulations.reduce((sum, s) => sum + (100 - (s.clicked_count / s.total_targets * 100)), 0) / simulations.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Risk Simulations
          </h1>
          <p className="text-slate-500 mt-1">
            Personalized simulations powered by AI to measure behavioral resilience
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/simulations/new')}
        >
          New Simulation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Simulations"
          value={activeCount.toString()}
          change={1.2}
          trend="up"
          icon={<Activity className="w-6 h-6" />}
          gradient="from-yellow-500 to-orange-500"
        />
        <StatCard
          title="Avg Resilience"
          value={`${avgResilience.toFixed(0)}%`}
          change={1.2}
          trend="up"
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Completed"
          value={completedCount.toString()}
          change={-18.4}
          trend="down"
          icon={<BarChart3 className="w-6 h-6" />}
          gradient="from-blue-500 to-cyan-500"
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
      ) : (
        <div className="space-y-4">
          {simulations.map((sim) => (
            <SimulationCard
              key={sim.id}
              simulation={sim}
              onClick={() => router.push(`/simulations/${sim.id}`)}
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
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'in_progress') return <Badge variant="warning">Active</Badge>;
    if (status === 'scheduled') return <Badge variant="info">Scheduled</Badge>;
    return <Badge variant="neutral">Draft</Badge>;
  };

  const clickRate = simulation.total_targets > 0
    ? ((simulation.clicked_count / simulation.total_targets) * 100).toFixed(1)
    : 0;

  return (
    <Card hover onClick={onClick} className="cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="font-bold text-slate-900">{simulation.name}</h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <span>{simulation.scenario_name}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{simulation.total_targets} Participants</span>
              </div>
              <span>•</span>
              <span>{clickRate}% Interaction Rate</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-slate-500">Created</div>
            <div className="text-sm font-semibold text-slate-900">
              {new Date(simulation.created_at).toLocaleDateString()}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}
