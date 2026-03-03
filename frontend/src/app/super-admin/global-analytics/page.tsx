/**
 * Super Admin - Global Intelligence Page
 * Cross-tenant benchmarking and infrastructure economic telemetry
 */

'use client';

import { useState, useEffect } from 'react';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { CheckCircle } from 'lucide-react';
import { globalAnalyticsAPI } from '@/lib/api';

interface DepartmentRisk {
  department: string;
  risk_score: number;
  employee_count: number;
}

interface RegionData {
  region: string;
  tenant_count: number;
  active_count: number;
  active_percentage: number;
  status: string;
}

export default function GlobalAnalyticsPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <GlobalIntelligenceContent />
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function GlobalIntelligenceContent() {
  const [loading, setLoading] = useState(true);
  const [industryRisk, setIndustryRisk] = useState<DepartmentRisk[]>([]);
  const [regionalData, setRegionalData] = useState<RegionData[]>([]);
  const [clusterUptime, setClusterUptime] = useState(100);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);

      const [industryResponse, regionalResponse] = await Promise.all([
        globalAnalyticsAPI.getIndustryRisk(),
        globalAnalyticsAPI.getRegionalIntegrity(),
      ]);

      setIndustryRisk((industryResponse as any).departments || []);
      setRegionalData((regionalResponse as any).regions || []);
      setClusterUptime((regionalResponse as any).cluster_uptime || 100);
    } catch (err: any) {
      console.error('Failed to fetch global analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Nominal':
        return 'bg-teal-500';
      case 'Optimal':
        return 'bg-green-500';
      case 'Elevated':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500"></div>
      </div>
    );
  }

  // Get top 5 departments by risk
  const topDepartments = industryRisk.slice(0, 5);
  const maxRisk = Math.max(...topDepartments.map(d => d.risk_score), 80);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Intelligence</h1>
        <p className="text-slate-500 text-sm mt-1">
          Cross-tenant benchmarking and infrastructure economic telemetry.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Industry Risk Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Industry Risk Distribution</h2>

          {topDepartments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No department data available
            </div>
          ) : (
            <div className="relative h-80">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-500">
                <div>{Math.ceil(maxRisk)}</div>
                <div>{Math.ceil(maxRisk * 0.75)}</div>
                <div>{Math.ceil(maxRisk * 0.5)}</div>
                <div>{Math.ceil(maxRisk * 0.25)}</div>
                <div>0</div>
              </div>

              {/* Chart area */}
              <div className="absolute left-10 right-0 top-0 bottom-10 flex items-end justify-around">
                {topDepartments.map((dept) => {
                  const heightPercent = (dept.risk_score / maxRisk) * 100;
                  return (
                    <div key={dept.department} className="flex flex-col items-center flex-1 mx-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                        <div className="font-semibold">{dept.department}</div>
                        <div>Risk: {dept.risk_score.toFixed(1)}</div>
                        <div className="text-slate-300">{dept.employee_count} employees</div>
                      </div>

                      {/* Bar */}
                      <div
                        className="w-full bg-teal-500 hover:bg-teal-600 transition-colors rounded-t cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                      ></div>

                      {/* Label */}
                      <div className="mt-2 text-xs text-slate-600 text-center w-full truncate">
                        {dept.department}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Regional Integrity */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Regional Integrity</h2>

          {regionalData.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No regional data available
            </div>
          ) : (
            <div className="space-y-4">
              {/* Region Bars */}
              {regionalData.map((region) => (
                <div key={region.region} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{region.region}</span>
                    <span className="text-sm text-slate-500">{region.status}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStatusColor(region.status)} transition-all`}
                      style={{ width: `${region.active_percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}

              {/* Protocol Standing */}
              <div className="mt-8 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <div>
                    <div className="text-xs text-slate-500">Protocol Standing</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {clusterUptime.toFixed(1)}% Cluster Uptime
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
