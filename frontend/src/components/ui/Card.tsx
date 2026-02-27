/**
 * Card Component
 *
 * Glassmorphism card with backdrop blur matching Maidar design
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const hoverStyles = hover ? 'hover:scale-105 hover:shadow-xl cursor-pointer' : '';

  return (
    <div
      className={`backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6 transition-all ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  gradient: string;
}) {
  const isPositive = trend === 'up';

  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`} />
      <div className="relative backdrop-blur-xl bg-white/60 rounded-2xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
      </div>
    </div>
  );
}
