/**
 * Settings Page
 * User profile and organization settings
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import {
  User,
  Mail,
  Lock,
  Building2,
  Shield,
  Bell,
  Palette,
  Key,
  CheckCircle,
  AlertCircle,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <SettingsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function SettingsContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'profile' | 'security' | 'organization' | 'notifications' | null;
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'organization' | 'notifications'>(tabParam || 'profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam && ['profile', 'security', 'organization', 'notifications'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // API call to update profile
      await authAPI.updateProfile({ full_name: fullName, email });

      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: User },
    { id: 'security' as const, name: 'Security', icon: Lock },
    { id: 'organization' as const, name: 'Organization', icon: Building2 },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your account and organization preferences
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
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
                  {user?.role}
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
                icon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
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
                  icon={<Lock className="w-4 h-4" />}
                >
                  Change Password
                </Button>
              </div>
            </div>
          </Card>

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
                Create New API Key
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Organization Details</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Organization Name
                  </label>
                  <Input
                    value="Acme Corporation"
                    disabled
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Contact support to change organization name
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subdomain
                  </label>
                  <Input
                    value="acme"
                    disabled
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Your organization's unique identifier
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    License Tier
                  </label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="info">Professional</Badge>
                    <span className="text-sm text-slate-600">100 seats</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Data Residency
                  </label>
                  <Badge variant="success">UAE</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Branding</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organization Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                    A
                  </div>
                  <div>
                    <Button variant="secondary" size="sm">
                      Upload Logo
                    </Button>
                    <p className="mt-1 text-xs text-slate-500">
                      PNG or JPG, max 2MB, recommended 512x512px
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Brand Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value="#14b8a6"
                    className="w-12 h-12 rounded-lg cursor-pointer"
                  />
                  <Input
                    value="#14b8a6"
                    className="w-32"
                    disabled
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <h2 className="text-xl font-bold text-slate-900 mb-6">Notification Preferences</h2>

          <div className="space-y-6">
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
              <Button icon={<Save className="w-4 h-4" />}>
                Save Preferences
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
