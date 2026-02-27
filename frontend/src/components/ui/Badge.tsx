/**
 * Badge Component
 *
 * Status indicators and labels
 */

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export default function Badge({ children, variant = 'neutral', size = 'md', dot = false }: BadgeProps) {
  const variantStyles = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-teal-100 text-teal-700 border-teal-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-teal-500',
    neutral: 'bg-slate-500',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {dot && <span className={`w-2 h-2 rounded-full ${dotColors[variant]} mr-1.5`} />}
      {children}
    </span>
  );
}
