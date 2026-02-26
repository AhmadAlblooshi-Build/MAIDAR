'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    {
      name: 'Company Risk Health',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Phishing Simulations',
      href: '/simulations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Employees',
      href: '/employees',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Risk Assessment',
      href: '/risk-assessment',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'AI Scenario Lab',
      href: '/ai-lab',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: 'Risk Analytics',
      href: '/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-lg">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left - Logo & Project Selector */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-teal-400 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-all"></div>
                <div className="relative bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl p-2 shadow-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-10-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Maidar
              </span>
            </div>

            <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100/80 backdrop-blur-sm border border-slate-200/50">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm text-slate-700 font-medium">Projects</span>
              <span className="text-xs text-slate-500">/</span>
              <span className="text-sm text-slate-900 font-semibold">Default</span>
            </div>
          </div>

          {/* Right - Notifications & User */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-slate-100/80 transition-colors">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-all"></div>
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=14b8a6&color=fff&bold=true`}
                  alt="User"
                  className="relative w-9 h-9 rounded-full ring-2 ring-white shadow-lg"
                />
              </div>
              <div className="flex items-center space-x-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{user?.full_name || 'User'}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-16 bottom-0 ${sidebarOpen ? 'w-64' : 'w-20'} backdrop-blur-xl bg-white/60 border-r border-slate-200/50 transition-all duration-300 z-40`}>
          <nav className="h-full overflow-y-auto py-6 px-3">
            <div className="space-y-2">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                      ${active
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 scale-105'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }
                    `}
                  >
                    <div className={active ? 'text-white' : 'text-slate-500'}>{item.icon}</div>
                    {sidebarOpen && <span className="text-sm">{item.name}</span>}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 p-8`}>
          {children}
        </main>
      </div>
    </div>
  );
}
