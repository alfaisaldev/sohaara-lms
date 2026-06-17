'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { useUser } from '@/lib/auth';
import {
  Loader2, User, Settings, Activity, Shield,
  Mail, Phone, Globe, Clock, MapPin,
  Calendar, Award, BookOpen, Zap,
  Github, Linkedin, Twitter, Globe2,
  Save, Key, CheckCircle, AlertCircle,
} from 'lucide-react';
import { AvatarUpload } from '@/components/upload/avatar-upload';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Asia/Kolkata',
  'Australia/Sydney', 'Pacific/Auckland',
];

const LOCALES = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'ja-JP', 'zh-CN', 'ar-AE'];

type Tab = 'overview' | 'settings' | 'activity' | 'security';

export default function ProfilePage() {
  const currentUser = useUser();
  const [tab, setTab] = useState<Tab>('overview');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });
  const [form, setForm] = useState<any>({});
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  const fetchProfile = useCallback(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    Promise.all([
      api.get<any>(`/users/${currentUser.id}`),
      api.get<any>('/skills/user/me').catch(() => null),
    ])
      .then(([userRes, skillsRes]) => {
        const u = userRes.data || userRes;
        setUser(u);
        setProfile(u.profile || {});
        setUserSkills(skillsRes?.data || (Array.isArray(skillsRes) ? skillsRes : []));
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          title: u.title || '',
          email: u.email || '',
          phone: u.phone || '',
          timezone: u.timezone || 'UTC',
          locale: u.locale || 'en-US',
          bio: u.bio || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg({ type: '', text: '' });
    try {
      await api.put(`/users/${user.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        title: form.title,
        phone: form.phone,
        timezone: form.timezone,
        locale: form.locale,
        bio: form.bio,
      });
      if (profile) {
        await api.put(`/users/${user.id}/profile`, {
          headline: form.headline,
          summary: form.summary,
          website: form.website,
          linkedin: form.linkedin,
          twitter: form.twitter,
          github: form.github,
        });
      }
      setSaveMsg({ type: 'success', text: 'Profile updated successfully' });
      fetchProfile();
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setPwMsg({ type: '', text: '' });
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      setPwMsg({ type: 'error', text: e.message || 'Failed to change password' });
    }
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'security', label: 'Security', icon: Shield },
  ];

  const statCards = [
    { label: 'Courses Completed', value: '—', icon: BookOpen, color: 'from-accent-indigo/10 to-accent-indigo-light/10', iconColor: 'text-accent-indigo' },
    { label: 'Certificates', value: '—', icon: Award, color: 'from-accent-orange/10 to-accent-orange-light/10', iconColor: 'text-accent-orange' },
    { label: 'Skills Assessed', value: `${userSkills?.length || 0}`, icon: Zap, color: 'from-success/10 to-success-light/10', iconColor: 'text-success' },
    { label: 'Member Since', value: user ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', icon: Calendar, color: 'from-accent-teal/10 to-accent-teal-light/10', iconColor: 'text-accent-teal' },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">Profile</h2>
        <p className="text-secondary-text text-sm mt-1">Manage your account and personal information</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/40 backdrop-blur-sm border border-white/20 w-fit animate-scale-in">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              tab === key
                ? 'bg-white text-primary-text shadow-sm'
                : 'text-secondary-text hover:text-primary-text hover:bg-white/30'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>
      ) : !user ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <AlertCircle size={36} className="text-danger" />
            </div>
            <p className="text-secondary-text">Could not load profile</p>
          </CardContent>
        </Card>
      ) : tab === 'overview' ? (
        <OverviewTab user={user} profile={profile} initials={initials} statCards={statCards} />
      ) : tab === 'settings' ? (
        <SettingsTab form={form} setForm={setForm} profile={profile} setProfile={setProfile}
          saving={saving} handleSave={handleSave} saveMsg={saveMsg} />
      ) : tab === 'activity' ? (
        <ActivityTab user={user} />
      ) : (
        <SecurityTab pwForm={pwForm} setPwForm={setPwForm} pwMsg={pwMsg} handlePasswordChange={handlePasswordChange} />
      )}
    </div>
  );
}

function OverviewTab({ user, profile, initials, statCards }: { user: any; profile: any; initials: string; statCards: any[] }) {
  const roles = (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('roles') || '[]') : []) as string[];

  return (
    <div className="space-y-6 animate-stagger">
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <AvatarUpload
              currentUrl={user.avatar}
              initials={initials}
              size={96}
              onUpdate={(url) => {
                Object.assign(user, { avatar: url });
                try {
                  const stored = JSON.parse(localStorage.getItem('user') || '{}');
                  stored.avatar = url;
                  localStorage.setItem('user', JSON.stringify(stored));
                } catch {}
              }}
            />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold tracking-tight text-primary-text">{user.firstName} {user.lastName}</h3>
              {user.title && <p className="text-secondary-text text-sm">{user.title}</p>}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="flex items-center gap-1 text-xs text-secondary-text">
                  <Mail size={12} /> {user.email}
                </span>
                {user.emailVerified && <CheckCircle size={14} className="text-success" />}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {roles.map((r: string) => (
                  <span key={r} className="text-xs px-2.5 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/20 capitalize">
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} variant="glass" className="hover:border-accent-indigo/30 transition-all duration-200">
              <CardContent className="p-4 text-center">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={20} className={stat.iconColor} />
                </div>
                <p className="text-2xl font-bold text-primary-text">{stat.value}</p>
                <p className="text-xs text-secondary-text mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {user.bio && (
          <Card variant="glass">
            <CardHeader><CardTitle className="text-sm text-primary-text">About</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-secondary-text leading-relaxed">{user.bio}</p></CardContent>
          </Card>
        )}
        {(profile?.linkedin || profile?.twitter || profile?.github || profile?.website) && (
          <Card variant="glass">
            <CardHeader><CardTitle className="text-sm text-primary-text">Links</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {profile.website && <SocialLink icon={Globe2} href={profile.website} label="Website" />}
              {profile.linkedin && <SocialLink icon={Linkedin} href={profile.linkedin} label="LinkedIn" />}
              {profile.twitter && <SocialLink icon={Twitter} href={profile.twitter} label="Twitter" />}
              {profile.github && <SocialLink icon={Github} href={profile.github} label="GitHub" />}
            </CardContent>
          </Card>
        )}
      </div>

      <Card variant="glass">
        <CardHeader><CardTitle className="text-sm text-primary-text">Account Details</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <DetailItem icon={Mail} label="Email" value={user.email} />
          {user.phone && <DetailItem icon={Phone} label="Phone" value={user.phone} />}
          {user.timezone && <DetailItem icon={Globe} label="Timezone" value={user.timezone} />}
          {user.locale && <DetailItem icon={MapPin} label="Locale" value={user.locale} />}
          <DetailItem icon={Calendar} label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
          {user.lastLoginAt && <DetailItem icon={Clock} label="Last Login" value={new Date(user.lastLoginAt).toLocaleString()} />}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab({ form, setForm, profile, setProfile, saving, handleSave, saveMsg }: any) {
  return (
    <div className="max-w-2xl animate-stagger space-y-6">
      {saveMsg.text && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          saveMsg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {saveMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {saveMsg.text}
        </div>
      )}

      <Card variant="glass">
        <CardHeader><CardTitle className="text-sm text-primary-text">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First Name" value={form.firstName} onChange={(v: string) => setForm({ ...form, firstName: v })} />
            <Field label="Last Name" value={form.lastName} onChange={(v: string) => setForm({ ...form, lastName: v })} />
          </div>
          <Field label="Email" value={form.email} disabled />
          <Field label="Title" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} placeholder="e.g. Senior Developer" />
          <Field label="Phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} placeholder="+1 (555) 000-0000" />
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Timezone" value={form.timezone} options={TIMEZONES.map(t => ({ value: t, label: t }))}
              onChange={(v: string) => setForm({ ...form, timezone: v })} />
            <SelectField label="Locale" value={form.locale} options={LOCALES.map(l => ({ value: l, label: l }))}
              onChange={(v: string) => setForm({ ...form, locale: v })} />
          </div>
          <div>
            <label className="block text-sm text-secondary-text mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3} placeholder="Tell us about yourself"
              className="w-full rounded-xl border border-white/20 bg-white/40 backdrop-blur-sm px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none placeholder:text-secondary-text" />
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader><CardTitle className="text-sm text-primary-text">Social Links</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Website" value={profile?.website || ''} onChange={(v: string) => setProfile({ ...profile, website: v })} placeholder="https://example.com" icon={Globe2} />
          <Field label="LinkedIn" value={profile?.linkedin || ''} onChange={(v: string) => setProfile({ ...profile, linkedin: v })} placeholder="https://linkedin.com/in/..." icon={Linkedin} />
          <Field label="Twitter" value={profile?.twitter || ''} onChange={(v: string) => setProfile({ ...profile, twitter: v })} placeholder="https://twitter.com/..." icon={Twitter} />
          <Field label="GitHub" value={profile?.github || ''} onChange={(v: string) => setProfile({ ...profile, github: v })} placeholder="https://github.com/..." icon={Github} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-indigo-light text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function ActivityTab({ user }: { user: any }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<any>(`/enrollments/user/${user.id}`, { limit: 10 }).catch(() => null),
      api.get<any>(`/certificates?userId=${user.id}`, { limit: 10 }).catch(() => null),
    ]).then(([enrollments, certificates]) => {
      const items: any[] = [];
      const eArr = enrollments?.data || (Array.isArray(enrollments) ? enrollments : []);
      const cArr = certificates?.data || (Array.isArray(certificates) ? certificates : []);
      eArr.slice(0, 10).forEach((e: any) => items.push({
        id: e.id,
        type: 'enrollment',
        message: `Enrolled in ${e.course?.title || 'a course'}`,
        time: e.createdAt,
        icon: BookOpen,
        color: 'from-accent-indigo/10 to-accent-indigo-light/10',
        iconColor: 'text-accent-indigo',
      }));
      cArr.slice(0, 10).forEach((c: any) => items.push({
        id: c.id,
        type: 'certificate',
        message: `Earned certificate: ${c.title}`,
        time: c.createdAt,
        icon: Award,
        color: 'from-accent-orange/10 to-accent-orange-light/10',
        iconColor: 'text-accent-orange',
      }));
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(items.slice(0, 20));
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent-indigo" size={24} /></div>;

  return (
    <div className="max-w-2xl space-y-4 animate-stagger">
      <Card variant="glass">
        <CardHeader><CardTitle className="text-sm text-primary-text">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-secondary-text text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-0">
              {activities.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={a.id} className={`flex items-start gap-4 py-3 ${i < activities.length - 1 ? 'border-b border-white/10' : ''}`}>
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className={a.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary-text">{a.message}</p>
                      <p className="text-xs text-secondary-text mt-0.5">{new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab({ pwForm, setPwForm, pwMsg, handlePasswordChange }: any) {
  return (
    <div className="max-w-2xl space-y-6 animate-stagger">
      <Card variant="glass">
        <CardHeader><CardTitle className="text-sm text-primary-text">Change Password</CardTitle></CardHeader>
        <CardContent>
          {pwMsg.text && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 ${
              pwMsg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}>
              {pwMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {pwMsg.text}
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Field label="Current Password" value={pwForm.currentPassword} onChange={(v: string) => setPwForm({ ...pwForm, currentPassword: v })} type="password" />
            <Field label="New Password" value={pwForm.newPassword} onChange={(v: string) => setPwForm({ ...pwForm, newPassword: v })} type="password" />
            <Field label="Confirm New Password" value={pwForm.confirmPassword} onChange={(v: string) => setPwForm({ ...pwForm, confirmPassword: v })} type="password" />
            <div className="flex justify-end pt-2">
              <button type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-indigo-light text-white text-sm font-medium hover:opacity-90 transition-all cursor-pointer">
                <Key size={16} /> Update Password
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled, type = 'text', icon: Icon }: any) {
  return (
    <div>
      <label className="block text-sm text-secondary-text mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">
            <Icon size={16} />
          </div>
        )}
        <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          className={`w-full rounded-xl border border-white/20 bg-white/40 backdrop-blur-sm px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all placeholder:text-secondary-text disabled:opacity-50 disabled:cursor-not-allowed ${Icon ? 'pl-10' : ''}`} />
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: any) {
  return (
    <div>
      <label className="block text-sm text-secondary-text mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/20 bg-white/40 backdrop-blur-sm px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all cursor-pointer">
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-white/20">
      <Icon size={16} className="text-secondary-text shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-secondary-text">{label}</p>
        <p className="text-sm text-primary-text truncate">{value}</p>
      </div>
    </div>
  );
}

function SocialLink({ icon: Icon, href, label }: any) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-accent-indigo hover:text-accent-indigo-light transition-colors cursor-pointer">
      <Icon size={16} /> {label}
    </a>
  );
}
