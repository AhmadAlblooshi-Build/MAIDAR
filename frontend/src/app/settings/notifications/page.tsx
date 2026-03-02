/**
 * Notifications Settings Page
 * Email and in-app notification preferences
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Bell, Save, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotificationsSettingsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <NotificationsSettingsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function NotificationsSettingsContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSavePreferences = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSuccess('Notification preferences saved successfully!');
      setSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-teal-500" />
            Notifications
          </h1>
          <p className="text-slate-600 mt-1">Manage how you receive notifications</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Notification Preferences Card */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Notification Preferences</h2>

        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Email Notifications</h3>

            {[
              { label: 'Simulation launched', description: 'Get notified when a simulation is launched' },
              { label: 'High-risk employee detected', description: 'Alert when an employee reaches high risk threshold' },
              { label: 'Simulation completed', description: 'Summary email when simulation finishes' },
              { label: 'Weekly risk report', description: 'Weekly summary of organizational risk metrics' },
              { label: 'Employee interactions', description: 'Real-time alerts for employee phishing interactions' },
            ].map((item, idx) => (
              <label key={idx} className="flex items-start space-x-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* In-App Notifications */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">In-App Notifications</h3>

            {[
              { label: 'Desktop notifications', description: 'Show browser notifications for important events' },
              { label: 'Sound alerts', description: 'Play sound for critical notifications' },
            ].map((item, idx) => (
              <label key={idx} className="flex items-start space-x-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  defaultChecked={idx === 0}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={handleSavePreferences}
              loading={saving}
              variant="primary"
              className="bg-teal-500 hover:bg-teal-600"
              icon={<Save className="w-4 h-4" />}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
