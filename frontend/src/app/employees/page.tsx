/**
 * Employee Management Page
 *
 * List, search, and manage employees
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { employeeAPI } from '@/lib/api';
import Layout from '@/components/Layout';
import { Users, Upload, Search, TrendingUp, Building2, Award } from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadEmployees();
    loadStatistics();
  }, [isAuthenticated]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.search({
        page: 1,
        page_size: 50,
        query: search,
      });
      setEmployees(response.employees);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await employeeAPI.statistics();
      setStats(response);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleSearch = () => {
    loadEmployees();
  };

  const handleCSVUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await employeeAPI.uploadCSV(file);
          alert('CSV uploaded successfully!');
          loadEmployees();
          loadStatistics();
        } catch (error: any) {
          alert(`Upload failed: ${error.detail}`);
        }
      }
    };
    input.click();
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
            <p className="mt-6 text-slate-600 font-medium">Loading employees...</p>
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
              Employee Management
            </h1>
            <p className="text-slate-500 mt-1">Manage employee data and risk profiles</p>
          </div>
          <button
            onClick={handleCSVUpload}
            className="group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Upload CSV</span>
            </div>
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Employees"
              value={stats.total_employees}
              icon={<Users className="w-6 h-6" />}
              gradient="from-blue-500 to-cyan-500"
            />
            <StatCard
              title="Avg Technical Literacy"
              value={`${stats.avg_technical_literacy.toFixed(1)}/10`}
              icon={<TrendingUp className="w-6 h-6" />}
              gradient="from-teal-500 to-emerald-500"
            />
            <StatCard
              title="Departments"
              value={Object.keys(stats.by_department).length}
              icon={<Building2 className="w-6 h-6" />}
              gradient="from-purple-500 to-pink-500"
            />
            <StatCard
              title="Seniority Levels"
              value={Object.keys(stats.by_seniority).length}
              icon={<Award className="w-6 h-6" />}
              gradient="from-orange-500 to-red-500"
            />
          </div>
        )}

        {/* Search Bar */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search employees by name, email, or department..."
                className="pl-12 w-full px-4 py-3 bg-white/80 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none text-slate-900 placeholder-slate-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="group relative px-8 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative">Search</span>
            </button>
          </div>
        </div>

        {/* Employee Table */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          {employees.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-slate-400 rounded-full blur-2xl opacity-20"></div>
                <div className="relative p-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                  <Users className="w-16 h-16 text-slate-400" />
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-700 mb-2">No employees found</p>
              <p className="text-slate-500 mb-6">Upload a CSV file to get started</p>
              <button
                onClick={handleCSVUpload}
                className="group relative inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Upload className="relative w-5 h-5" />
                <span className="relative">Upload CSV</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Seniority
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Tech Literacy
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, idx) => (
                    <tr
                      key={employee.id}
                      className={`border-b border-white/10 hover:bg-white/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white/20' : 'bg-transparent'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative group/avatar">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full blur-md opacity-0 group-hover/avatar:opacity-50 transition-opacity"></div>
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(employee.full_name)}&background=14b8a6&color=fff&bold=true`}
                              alt={employee.full_name}
                              className="relative w-10 h-10 rounded-full ring-2 ring-white"
                            />
                          </div>
                          <span className="font-medium text-slate-900">{employee.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{employee.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-medium">{employee.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200">
                          {employee.seniority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                              style={{ width: `${(employee.technical_literacy / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 min-w-[3ch]">
                            {employee.technical_literacy}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-teal-600 hover:text-teal-700 font-semibold text-sm hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
