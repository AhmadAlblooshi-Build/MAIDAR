/**
 * Spinner Component
 *
 * Loading indicator matching Maidar design
 */

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function Spinner({ size = 'md', fullScreen = false }: SpinnerProps) {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const spinner = (
    <div className="relative inline-block">
      <div className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-50 animate-pulse" />
      <div className={`relative animate-spin rounded-full ${sizeStyles[size]} border-4 border-slate-200 border-t-teal-500`} />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          {spinner}
          <p className="mt-6 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return spinner;
}
