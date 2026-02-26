/**
 * Simulations Page
 *
 * List and manage phishing simulation campaigns
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { simulationAPI } from '@/lib/api';
import Layout from '@/components/Layout';
import { Activity, Plus, BarChart, PlayCircle, Target, Users, Clock } from 'lucide-react';

export default function SimulationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadSimulations();
  }, [isAuthenticated]);

  const loadSimulations = async () => {
    try {
      setLoading(true);
      const response = await simulationAPI.search({
        page: 1,
        page_size: 50,
      });
      setSimulations(response.simulations);
    } catch (error) {
      console.error('Failed to load simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { bg: 'from-slate-100 to-slate-200', text: 'text-slate-700', border: 'border-slate-300' },
      scheduled: { bg: 'from-blue-100 to-cyan-100', text: 'text-blue-700', border: 'border-blue-300' },
      in_progress: { bg: 'from-yellow-100 to-orange-100', text: 'text-yellow-700', border: 'border-yellow-300' },
      completed: { bg: 'from-green-100 to-emerald-100', text: 'text-green-700', border: 'border-green-300' },
      cancelled: { bg: 'from-red-100 to-rose-100', text: 'text-red-700', border: 'border-red-300' },
    };

    const style = styles[status as keyof typeof styles] || styles.draft;

    return (
      <span
        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r ${style.bg} ${style.text} border ${style.border}`}
      >
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-teal-500"></div>
            </div>
            <p className="mt-6 text-slate-600 font-medium">Loading simulations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const activeSimulations = simulations.filter(s => s.status === 'in_progress').length;
  const completedSimulations = simulations.filter(s => s.status === 'completed').length;
  const totalTargets = simulations.reduce((sum, s) => sum + (s.total_targets || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Phishing Simulations
            </h1>
            <p className="text-slate-500 mt-1">Manage and track simulation campaigns</p>
          </div>
          <button
            onClick={() => alert('Create simulation flow would go here')}
            className="group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>New Simulation</span>
            </div>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Active Simulations"
            value={activeSimulations}
            icon={<Activity className="w-6 h-6" />}
            gradient="from-yellow-500 to-orange-500"
          />
          <StatCard
            title="Completed Campaigns"
            value={completedSimulations}
            icon={<BarChart className="w-6 h-6" />}
            gradient="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Total Targets"
            value={totalTargets}
            icon={<Users className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-500"
          />
        </div>

        {/* Simulations Grid */}
        {simulations.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-16">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-teal-400 rounded-full blur-2xl opacity-20"></div>
                <div className="relative p-6 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100">
                  <Activity className="w-16 h-16 text-teal-600" />
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-700 mb-2">No simulations found</p>
              <p className="text-slate-500 mb-6">Create your first phishing simulation campaign</p>
              <button
                onClick={() => alert('Create simulation flow would go here')}
                className="group relative inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Plus className="relative w-5 h-5" />
                <span className="relative">Create Simulation</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {simulations.map((sim) => (
              <SimulationCard
                key={sim.id}
                simulation={sim}
                onViewResults={() => router.push(`/simulations/${sim.id}`)}
                onLaunch={async () => {
                  try {
                    await simulationAPI.launch(sim.id, { send_immediately: true });
                    alert('Simulation launched!');
                    loadSimulations();
                  } catch (error: any) {
                    alert(`Failed to launch: ${error.detail}`);
                  }
                }}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
}

function StatCard({ title, value, icon, gradient }: StatCardProps) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
      </div>
    </div>
  );
}

// Simulation Card Component
interface SimulationCardProps {
  simulation: any;
  onViewResults: () => void;
  onLaunch: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

function SimulationCard({ simulation, onViewResults, onLaunch, getStatusBadge }: SimulationCardProps) {
  return (
    <div className="group backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-bold text-slate-900">{simulation.name}</h3>
              {getStatusBadge(simulation.status)}
            </div>
            {simulation.description && (
              <p className="text-slate-600 text-sm mb-3">{simulation.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Scenario</div>
              <div className="text-sm font-bold text-slate-900">{simulation.scenario_name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Targets</div>
              <div className="text-sm font-bold text-slate-900">{simulation.total_targets}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Created</div>
              <div className="text-sm font-bold text-slate-900">
                {new Date(simulation.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Status</div>
              <div className="text-sm font-bold text-slate-900">{simulation.status.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onViewResults}
            className="flex-1 group/btn relative px-4 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-center space-x-2">
              <BarChart className="w-4 h-4" />
              <span>View Results</span>
            </div>
          </button>

          {simulation.status === 'draft' && (
            <button
              onClick={onLaunch}
              className="flex-1 group/btn relative px-4 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center space-x-2">
                <PlayCircle className="w-4 h-4" />
                <span>Launch Now</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
