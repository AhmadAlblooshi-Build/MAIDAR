/**
 * Super Admin - Global Analytics Page
 * Platform-wide analytics, industry benchmarks, and regional insights
 */

'use client';

import { useState } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Card, { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Calendar, TrendingUp, TrendingDown, Globe, Building2, Users, Target, Download, BarChart3 } from 'lucide-react';

export default function GlobalAnalyticsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <GlobalAnalyticsContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function GlobalAnalyticsContent() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Mock data - would be fetched from API
  const platformStats = {
    total_employees: 15847,
    total_simulations: 3456,
    avg_risk_score: 6.8,
    platform_resilience: 78.3,
  };

  const industryData = [
    { industry: 'Financial Services', avg_risk: 7.8, tenant_count: 24, color: 'from-red-500 to-rose-500' },
    { industry: 'Healthcare', avg_risk: 7.2, tenant_count: 18, color: 'from-orange-500 to-amber-500' },
    { industry: 'Technology', avg_risk: 5.9, tenant_count: 42, color: 'from-yellow-500 to-orange-500' },
    { industry: 'Manufacturing', avg_risk: 6.5, tenant_count: 15, color: 'from-green-500 to-emerald-500' },
    { industry: 'Retail', avg_risk: 6.8, tenant_count: 22, color: 'from-blue-500 to-cyan-500' },
    { industry: 'Education', avg_risk: 5.2, tenant_count: 12, color: 'from-purple-500 to-pink-500' },
  ];

  const regionalData = [
    { region: 'North America', tenants: 78, avg_risk: 6.4, employees: 8450 },
    { region: 'Europe', tenants: 52, avg_risk: 6.1, employees: 5230 },
    { region: 'Asia Pacific', tenants: 34, avg_risk: 7.2, employees: 3890 },
    { region: 'Latin America', tenants: 18, avg_risk: 6.9, employees: 1240 },
    { region: 'Middle East', tenants: 12, avg_risk: 7.5, employees: 890 },
  ];

  const trendData = [
    { month: 'Jan', risk_score: 7.2, simulations: 280, click_rate: 32 },
    { month: 'Feb', risk_score: 7.0, simulations: 295, click_rate: 30 },
    { month: 'Mar', risk_score: 6.8, simulations: 310, click_rate: 28 },
    { month: 'Apr', risk_score: 6.7, simulations: 325, click_rate: 26 },
    { month: 'May', risk_score: 6.5, simulations: 340, click_rate: 24 },
    { month: 'Jun', risk_score: 6.4, simulations: 355, click_rate: 23 },
  ];

  const topPerformers = [
    { name: 'Acme Corporation', industry: 'Technology', risk_score: 4.2, improvement: 2.8 },
    { name: 'Global Finance Ltd', industry: 'Financial Services', risk_score: 5.1, improvement: 2.3 },
    { name: 'MediCare Health', industry: 'Healthcare', risk_score: 5.4, improvement: 2.1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Global Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Platform-wide insights and industry benchmarks
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Download className="w-4 h-4" />}
        >
          Export Report
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-slate-500" />
          <div className="flex space-x-2">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-white/50 text-slate-600 hover:bg-white/80'
                }`}
              >
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
                {range === '90d' && 'Last 90 Days'}
                {range === '1y' && 'Last Year'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            options={[
              { value: 'all', label: 'All Industries' },
              { value: 'finance', label: 'Financial Services' },
              { value: 'healthcare', label: 'Healthcare' },
              { value: 'technology', label: 'Technology' },
              { value: 'manufacturing', label: 'Manufacturing' },
            ]}
          />
          <Select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            options={[
              { value: 'all', label: 'All Regions' },
              { value: 'na', label: 'North America' },
              { value: 'eu', label: 'Europe' },
              { value: 'apac', label: 'Asia Pacific' },
            ]}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={platformStats.total_employees.toLocaleString()}
          change={8.2}
          trend="up"
          icon={<Users className="w-6 h-6" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Active Simulations"
          value={platformStats.total_simulations.toLocaleString()}
          change={12.5}
          trend="up"
          icon={<Target className="w-6 h-6" />}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          title="Avg Risk Score"
          value={platformStats.avg_risk_score.toFixed(1)}
          change={-4.2}
          trend="down"
          icon={<TrendingDown className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Platform Resilience"
          value={`${platformStats.platform_resilience.toFixed(1)}%`}
          change={6.8}
          trend="up"
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-orange-500 to-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Industry Risk Distribution</h2>
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            {industryData.map((industry, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${industry.color}`} />
                    <span className="font-semibold text-slate-900">{industry.industry}</span>
                    <span className="text-sm text-slate-500">({industry.tenant_count} tenants)</span>
                  </div>
                  <span className="font-bold text-slate-900">{industry.avg_risk.toFixed(1)}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${industry.color} rounded-full transition-all duration-1000 group-hover:scale-105`}
                    style={{ width: `${(industry.avg_risk / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Regional Integrity Index</h2>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Globe className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            {regionalData.map((region, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-slate-900">{region.region}</div>
                  <div className={`text-sm font-bold ${
                    region.avg_risk >= 7 ? 'text-red-600' :
                    region.avg_risk >= 6 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {region.avg_risk.toFixed(1)} Risk
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Tenants</div>
                    <div className="font-semibold text-slate-900">{region.tenants}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Employees</div>
                    <div className="font-semibold text-slate-900">{region.employees.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Platform Trends</h2>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 rounded-lg text-sm font-medium bg-teal-500 text-white">
              Risk Score
            </button>
            <button className="px-3 py-1 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              Simulations
            </button>
            <button className="px-3 py-1 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              Click Rate
            </button>
          </div>
        </div>
        <div className="h-80 flex items-end justify-between space-x-3">
          {trendData.map((data, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center space-y-2">
              <div className="w-full bg-slate-200 rounded-t-lg relative overflow-hidden" style={{ height: '280px' }}>
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-lg transition-all duration-1000"
                  style={{ height: `${(data.risk_score / 10) * 100}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-600">{data.month}</div>
              <div className="text-sm font-bold text-slate-900">{data.risk_score.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Top Performers</h2>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-4">
            {topPerformers.map((tenant, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-slate-200 hover:bg-green-50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{tenant.name}</div>
                      <div className="text-xs text-slate-500">{tenant.industry}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">{tenant.risk_score.toFixed(1)}</div>
                    <div className="text-xs text-slate-500">-{tenant.improvement.toFixed(1)} improved</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Platform Health</h2>
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">System Uptime</span>
                <span className="text-lg font-bold text-green-600">99.98%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[99.98%] bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Active Tenant Rate</span>
                <span className="text-lg font-bold text-blue-600">94.2%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[94.2%] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Simulation Success Rate</span>
                <span className="text-lg font-bold text-purple-600">87.6%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[87.6%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Data Processing Speed</span>
                <span className="text-lg font-bold text-orange-600">0.42s</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
