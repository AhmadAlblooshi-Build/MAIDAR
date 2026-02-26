/**
 * AI Scenario Lab Page
 *
 * Generate AI-powered phishing scenarios
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { scenarioAPI } from '@/lib/api';
import Layout from '@/components/Layout';
import { Zap, Brain, Sparkles, Target, Mail, Globe, Cpu } from 'lucide-react';

export default function AILabPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadScenarios();
  }, [isAuthenticated]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const [scenarioResponse, stats] = await Promise.all([
        scenarioAPI.search({ page: 1, page_size: 10 }),
        scenarioAPI.statistics().catch(() => null),
      ]);
      setScenarios(scenarioResponse.scenarios || []);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const scenarioTypes = [
    {
      title: 'Spear Phishing',
      description: 'Targeted attacks using personalized information',
      icon: <Target className="w-6 h-6" />,
      gradient: 'from-red-500 to-rose-500',
      difficulty: 'Advanced',
    },
    {
      title: 'CEO Fraud',
      description: 'Executive impersonation for financial fraud',
      icon: <Mail className="w-6 h-6" />,
      gradient: 'from-orange-500 to-amber-500',
      difficulty: 'Expert',
    },
    {
      title: 'Credential Harvesting',
      description: 'Fake login pages to steal credentials',
      icon: <Globe className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      difficulty: 'Intermediate',
    },
    {
      title: 'Business Email Compromise',
      description: 'Sophisticated email-based social engineering',
      icon: <Cpu className="w-6 h-6" />,
      gradient: 'from-purple-500 to-pink-500',
      difficulty: 'Advanced',
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-teal-500"></div>
            </div>
            <p className="mt-6 text-slate-600 font-medium">Loading AI Lab...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              AI Scenario Lab
            </h1>
            <p className="text-slate-500 mt-1">Generate intelligent phishing scenarios powered by AI</p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50">
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span className="text-sm font-medium text-purple-700">AI Powered</span>
          </div>
        </div>

        {/* AI Generation Card */}
        <div className="relative overflow-hidden backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
          </div>

          <div className="relative p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative p-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl">
                  <Brain className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-slate-900 mb-4">
              Generate AI-Powered Scenario
            </h2>
            <p className="text-center text-slate-600 mb-8 max-w-2xl mx-auto">
              Our AI analyzes your organization's data, recent trends, and employee profiles to create
              highly realistic and effective phishing scenarios tailored to your needs.
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  setGenerating(true);
                  setTimeout(() => {
                    setGenerating(false);
                    alert('AI scenario generation coming soon!');
                  }, 2000);
                }}
                disabled={generating}
                className="group relative px-8 py-4 rounded-xl font-bold text-white overflow-hidden shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center space-x-3">
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Generate Scenario</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Scenario Types */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Scenario Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {scenarioTypes.map((scenario, idx) => (
              <ScenarioTypeCard key={idx} {...scenario} />
            ))}
          </div>
        </div>

        {/* Recent Scenarios - Real Data */}
        {scenarios.length > 0 && (
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Scenarios ({scenarios.length})</h2>
            <div className="space-y-4">
              {scenarios.map((scenario, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between p-4 rounded-xl bg-white/50 hover:bg-white/80 transition-all border border-white/20 hover:shadow-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        {scenario.name}
                      </h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-slate-500">{scenario.scenario_type}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-sm text-slate-500">
                          {new Date(scenario.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-600">Difficulty</div>
                      <div className="text-lg font-bold text-purple-600">{scenario.difficulty}</div>
                    </div>
                    <button
                      onClick={() => router.push(`/scenarios/${scenario.id}`)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Scenarios Message */}
        {scenarios.length === 0 && (
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-purple-400 rounded-full blur-2xl opacity-20"></div>
              <div className="relative p-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
                <Brain className="w-16 h-16 text-purple-600" />
              </div>
            </div>
            <p className="text-lg font-semibold text-slate-700 mb-2">No scenarios generated yet</p>
            <p className="text-slate-500 mb-6">Generate your first AI-powered phishing scenario</p>
          </div>
        )}

        {/* AI Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="Smart Personalization"
            description="AI analyzes employee profiles for maximum realism"
            icon={<Target className="w-6 h-6" />}
            gradient="from-blue-500 to-cyan-500"
          />
          <FeatureCard
            title="Contextual Awareness"
            description="Scenarios adapt to current events and company context"
            icon={<Brain className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-500"
          />
          <FeatureCard
            title="Continuous Learning"
            description="AI improves based on simulation results"
            icon={<Zap className="w-6 h-6" />}
            gradient="from-orange-500 to-red-500"
          />
        </div>
      </div>
    </Layout>
  );
}

// Scenario Type Card Component
interface ScenarioTypeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  difficulty: string;
}

function ScenarioTypeCard({ title, description, icon, gradient, difficulty }: ScenarioTypeCardProps) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative backdrop-blur-xl bg-white/60 rounded-xl border border-white/20 shadow-lg p-6 hover:scale-105 transition-all">
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${gradient} text-white`}>
            {difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

function FeatureCard({ title, description, icon, gradient }: FeatureCardProps) {
  return (
    <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}
