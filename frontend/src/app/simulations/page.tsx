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
import { Activity, Plus, BarChart, PlayCircle } from 'lucide-react';

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
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          styles[status as keyof typeof styles] || styles.draft
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Simulation Campaigns</h1>
              <p className="text-sm text-gray-500">Manage phishing simulations</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => alert('Create simulation flow would go here')}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Simulation
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simulations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scenario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Targets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {simulations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No simulations found</p>
                    <button
                      onClick={() => alert('Create simulation flow would go here')}
                      className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Create your first simulation
                    </button>
                  </td>
                </tr>
              ) : (
                simulations.map((sim) => (
                  <tr key={sim.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{sim.name}</div>
                      {sim.description && (
                        <div className="text-sm text-gray-500">{sim.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sim.scenario_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(sim.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sim.total_targets}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(sim.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/simulations/${sim.id}`)
                          }
                          className="text-primary-600 hover:text-primary-900 flex items-center"
                        >
                          <BarChart className="w-4 h-4 mr-1" />
                          Results
                        </button>
                        {sim.status === 'draft' && (
                          <button
                            onClick={async () => {
                              try {
                                await simulationAPI.launch(sim.id, { send_immediately: true });
                                alert('Simulation launched!');
                                loadSimulations();
                              } catch (error: any) {
                                alert(`Failed to launch: ${error.detail}`);
                              }
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <PlayCircle className="w-4 h-4 mr-1" />
                            Launch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
