/**
 * Organization Settings Page
 * Company details, branding, and team management
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantAdminGuard from '@/components/guards/TenantAdminGuard';
import TenantAdminLayout from '@/components/tenant-admin/TenantAdminLayout';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Building2, Palette, Save, CheckCircle, ArrowLeft } from 'lucide-react';

export default function OrganizationSettingsPage() {
  return (
    <TenantAdminGuard>
      <TenantAdminLayout>
        <OrganizationSettingsContent />
      </TenantAdminLayout>
    </TenantAdminGuard>
  );
}

function OrganizationSettingsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState('#14b8a6');

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSuccess('Organization settings saved successfully!');
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
            <Building2 className="w-8 h-8 text-teal-500" />
            Organization
          </h1>
          <p className="text-slate-600 mt-1">Manage your organization details and branding</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Organization Details Card */}
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

      {/* Branding Card */}
      <Card>
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-teal-500" />
          Branding
        </h2>

        <div className="space-y-6">
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
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-slate-300"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-slate-600">
                Used for buttons, links, and accent colors
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={handleSave}
              loading={saving}
              variant="primary"
              className="bg-teal-500 hover:bg-teal-600"
              icon={<Save className="w-4 h-4" />}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
