/**
 * 403 Forbidden Page
 * Displayed when user doesn't have permission to access a resource
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            !
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            403
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Access Denied
          </h2>
          <p className="text-lg text-slate-600 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-slate-500">
            This resource is restricted. Contact your administrator if you believe you should have access.
          </p>
        </div>

        {/* Illustration */}
        <div className="mb-10 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-200 rounded-full blur-3xl opacity-20"></div>
            <ShieldAlert className="relative w-32 h-32 text-slate-300" strokeWidth={1} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-white font-medium hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Home className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Help Box */}
        <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">
                Need Access?
              </h3>
              <p className="text-sm text-amber-800">
                Contact your system administrator or tenant admin to request access to this resource.
                Include the page URL and explain why you need access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
