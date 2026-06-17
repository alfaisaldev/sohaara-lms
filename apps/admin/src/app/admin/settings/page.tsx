'use client';

import { useEffect, useState } from 'react';
import { Button } from '@sohaara/ui';
import { adminApi as api } from '@/lib/api';
import { Settings as SettingsIcon, Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface SettingItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'toggle';
  value: any;
  options?: string[];
}

interface SettingGroup {
  title: string;
  settings: SettingItem[];
}

const defaultGroups: SettingGroup[] = [
  {
    title: 'General',
    settings: [
      { key: 'site_name', label: 'Site Name', type: 'text', value: 'Sohaara LMS' },
      { key: 'site_description', label: 'Description', type: 'text', value: 'Enterprise Learning Platform' },
      { key: 'default_language', label: 'Default Language', type: 'select', value: 'en', options: ['en', 'es', 'fr', 'de', 'ar', 'zh'] },
      { key: 'timezone', label: 'Timezone', type: 'select', value: 'UTC', options: ['UTC', 'US/Eastern', 'US/Pacific', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai'] },
    ],
  },
  {
    title: 'Learning',
    settings: [
      { key: 'default_pass_score', label: 'Default Passing Score (%)', type: 'number', value: 60 },
      { key: 'max_attempts', label: 'Max Quiz Attempts', type: 'number', value: 3 },
      { key: 'auto_enroll', label: 'Auto-enroll on Register', type: 'toggle', value: false },
      { key: 'certificate_expiry_days', label: 'Certificate Expiry (days)', type: 'number', value: 365 },
    ],
  },
  {
    title: 'Notifications',
    settings: [
      { key: 'email_notifications', label: 'Enable Email Notifications', type: 'toggle', value: true },
      { key: 'digest_frequency', label: 'Digest Frequency', type: 'select', value: 'weekly', options: ['never', 'daily', 'weekly', 'monthly'] },
      { key: 'new_user_welcome', label: 'Welcome Email on Registration', type: 'toggle', value: true },
    ],
  },
  {
    title: 'Security',
    settings: [
      { key: 'mfa_required', label: 'Require MFA for Admins', type: 'toggle', value: false },
      { key: 'session_timeout_minutes', label: 'Session Timeout (minutes)', type: 'number', value: 120 },
      { key: 'max_login_attempts', label: 'Max Login Attempts', type: 'number', value: 5 },
    ],
  },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<SettingGroup[]>(defaultGroups);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<any>('/settings')
      .then((settings) => {
        if (settings && typeof settings === 'object') {
          setGroups((prev) => prev.map((group) => ({
            ...group,
            settings: group.settings.map((s) => ({
              ...s,
              value: settings[s.key] !== undefined ? settings[s.key] : s.value,
            })),
          })));
        }
      })
      .catch(() => {
        // Use defaults if settings endpoint not available
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = (groupIdx: number, key: string, value: any) => {
    setGroups((prev) => prev.map((g, gi) =>
      gi === groupIdx ? {
        ...g,
        settings: g.settings.map((s) => s.key === key ? { ...s, value } : s),
      } : g
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = {};
    groups.forEach((g) => g.settings.forEach((s) => { payload[s.key] = s.value; }));
    try {
      await api.put('/settings', payload);
      toast('success', 'Settings saved successfully');
    } catch (err: any) {
      toast('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-accent-indigo" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-secondary-text text-sm mt-1">Configure platform-wide settings</p>
        </div>
        <Button onClick={handleSave} loading={saving} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
          <Save size={16} />
          Save Changes
        </Button>
      </div>

      <div className="space-y-6 animate-stagger">
        {groups.map((group, gi) => (
          <div key={group.title} className="glass-dark-card border-border/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo-light" />
              {group.title}
            </h2>
            <div className="space-y-4">
              {group.settings.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2">
                  <label className="text-sm text-gray-300">{s.label}</label>
                  {s.type === 'toggle' ? (
                    <div
                      onClick={() => updateSetting(gi, s.key, !s.value)}
                      className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${s.value ? 'bg-accent-indigo' : 'bg-white/10'}`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${s.value ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                    </div>
                  ) : s.type === 'select' ? (
                    <select
                      value={String(s.value)}
                      onChange={(e) => updateSetting(gi, s.key, e.target.value)}
                      className="bg-white/5 border border-border/50 rounded-lg px-3 py-1.5 text-sm outline-none text-white focus:border-accent-indigo/50 w-48 cursor-pointer"
                    >
                      {s.options?.map((o) => <option className="text-gray-900 bg-white" key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={s.type}
                      value={String(s.value)}
                      onChange={(e) => updateSetting(gi, s.key, s.type === 'number' ? Number(e.target.value) : e.target.value)}
                      className="bg-white/5 border border-border/50 rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-white focus:border-accent-indigo/50 transition-all"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end animate-fade-in-up">
        <Button onClick={handleSave} loading={saving} variant="primary" className="rounded-xl shadow-lg shadow-accent-indigo/20 h-11 px-6 cursor-pointer">
          <Save size={16} />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
