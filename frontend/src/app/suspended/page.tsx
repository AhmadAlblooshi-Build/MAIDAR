'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function SuspendedPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is actually suspended by verifying auth
    const checkSuspensionStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Try to fetch user profile to verify suspension status
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // If successful, user is no longer suspended - redirect to dashboard
        if (response.ok) {
          const userData = await response.json();

          // Redirect based on role
          if (userData.role === 'PLATFORM_SUPER_ADMIN' || userData.role === 'SUPER_ADMIN') {
            router.push('/super-admin/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
        // If 403, user is still suspended - stay on this page
        // If 401, token expired - redirect to login
        else if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking suspension status:', error);
      }
    };

    // Check immediately
    checkSuspensionStatus();

    // Check every 30 seconds in case suspension is lifted
    const interval = setInterval(checkSuspensionStatus, 30000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Suspension Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Account Suspended
            </h1>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <p className="text-slate-600 text-lg mb-4">
                Your organization's account has been temporarily suspended.
              </p>
              <p className="text-slate-500 text-sm">
                This could be due to billing issues, policy violations, or administrative actions.
                Please contact our support team to resolve this issue and restore access to your account.
              </p>
            </div>

            {/* Contact Support Section */}
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  <span className="font-medium">Email:</span>{' '}
                  <a href="mailto:support@maidar.ae" className="text-blue-600 hover:text-blue-700 hover:underline">
                    support@maidar.ae
                  </a>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Phone:</span>{' '}
                  <a href="tel:+97144567890" className="text-blue-600 hover:text-blue-700 hover:underline">
                    +971 4 456 7890
                  </a>
                </p>
              </div>
            </div>

            {/* Auto-refresh Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 text-center">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This page will automatically refresh when your account is restored
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-slate-500 text-sm">
            &copy; 2024 MAIDAR. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
