/**
 * Tenant Admin Portal Layout
 *
 * Layout with sidebar navigation for Tenant Admin portal
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutGrid,
  Target,
  Users,
  FileText,
  Brain,
  TrendingUp,
  Bell,
  ChevronDown,
  Settings,
} from 'lucide-react';

interface TenantAdminLayoutProps {
  children: React.ReactNode;
}

export default function TenantAdminLayout({ children }: TenantAdminLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navigation = [
    { name: 'Company Risk Health', href: '/dashboard', icon: LayoutGrid },
    { name: 'Risk Simulations', href: '/simulations', icon: Target },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Risk Assessment', href: '/risk-assessment', icon: FileText },
    { name: 'AI Scenario Lab', href: '/ai-lab', icon: Brain },
    { name: 'Risk Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside data-testid="sidebar-navigation" className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <Link href="/dashboard" prefetch={false} className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
            <span className="text-xl font-bold text-slate-900">Maidar</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav data-testid="main-navigation" className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-xl transition-all
                  ${active
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-8 py-4">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <span>Projects</span>
              <span>/</span>
              <span>Default</span>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-700">
                    {user?.full_name || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
