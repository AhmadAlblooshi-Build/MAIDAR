/**
 * Profile Settings Page
 * User profile information and preferences
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { User, Save, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <ProfileSettingsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function ProfileSettingsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await authAPI.updateProfile({ full_name: fullName, email });

      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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
            <User className="w-8 h-8 text-teal-500" />
            Profile Settings
          </h1>
          <p className="text-slate-600 mt-1">Manage your personal information</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Profile Card */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Profile Information</h2>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{user?.full_name}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <Badge variant="info" size="sm" className="mt-2">
                {user?.role === 'TENANT_ADMIN' ? 'Tenant Administrator' : user?.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={handleSaveProfile}
              loading={saving}
              variant="primary"
              className="bg-teal-500 hover:bg-teal-600"
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
