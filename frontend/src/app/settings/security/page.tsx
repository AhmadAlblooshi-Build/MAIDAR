/**
 * Security Settings Page
 * Password, 2FA, and API key management
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { authAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Lock, Shield, Key, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function SecuritySettingsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <SecuritySettingsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function SecuritySettingsContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      await authAPI.changePassword(currentPassword, newPassword);

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.detail || 'Failed to change password');
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
            <Lock className="w-8 h-8 text-teal-500" />
            Security & Password
          </h1>
          <p className="text-slate-600 mt-1">Manage your account security and authentication</p>
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

      {/* Change Password Card */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Change Password</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Password
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Password
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={handleChangePassword}
              loading={saving}
              disabled={!currentPassword || !newPassword || !confirmPassword}
              variant="primary"
              className="bg-teal-500 hover:bg-teal-600"
              icon={<Lock className="w-4 h-4" />}
            >
              Change Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Two-Factor Authentication</h2>

        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Enhance Your Account Security
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Add an extra layer of security to your account by enabling two-factor authentication.
              You'll need to enter a code from your authenticator app when signing in.
            </p>
            <Button variant="secondary" size="sm">
              Enable 2FA
            </Button>
          </div>
        </div>
      </Card>

      {/* API Keys Card */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6">API Keys</h2>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            API keys allow you to access MAIDAR programmatically. Keep your keys secure and never share them publicly.
          </p>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <Key className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Production API Key</p>
                <p className="text-xs text-slate-500">Last used 2 days ago</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Regenerate
            </Button>
          </div>

          <Button variant="secondary" size="sm">
            Generate New Key
          </Button>
        </div>
      </Card>
    </div>
  );
}
