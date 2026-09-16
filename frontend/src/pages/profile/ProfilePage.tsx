import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { 
  User, 
  Mail, 
  Lock, 
  Building2, 
  Phone, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  LogOut, 
  Check, 
  Sparkles,
  AlertCircle,
  KeyRound,
  ExternalLink
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, plan, subscription, logout, refreshProfile } = useAuth();

  // Profile Details State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Email State
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setBusinessName(user.businessName || '');
    }
  }, [user]);

  // Handle Profile Details Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSaved(false);

    const res = await ApiService.updateProfile({
      name: fullName,
      phone,
      businessName
    });

    setIsSavingProfile(false);
    if (res.status) {
      setProfileSaved(true);
      await refreshProfile();
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      setProfileError(res.error || 'Failed to update profile');
    }
  };

  // Handle Email Update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsUpdatingEmail(true);
    setEmailError('');
    setEmailSuccess('');

    const res = await ApiService.updateEmail(newEmail.trim());
    setIsUpdatingEmail(false);
    if (res.status) {
      setEmailSuccess('Email address updated successfully!');
      setNewEmail('');
      await refreshProfile();
      setTimeout(() => setEmailSuccess(''), 4000);
    } else {
      setEmailError(res.error || 'Failed to update email');
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Both passwords must match.');
      return;
    }

    setIsUpdatingPassword(true);
    const res = await ApiService.updatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (res.status) {
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } else {
      setPasswordError(res.error || 'Failed to update password');
    }
  };

  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Recent Member';

  return (
    <div className="max-w-3xl space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">My profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your details, sign-in email, credentials, and password.
        </p>
      </div>

      {/* 1. Profile Details Card */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/80 p-6 backdrop-blur-xl shadow-xl space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <User className="h-4 w-4 text-purple-400" />
            <span>Profile details</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Shown on your account, hosted payment pages, and support requests.
          </p>
        </div>

        {profileSaved && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2 text-xs font-bold text-emerald-400 animate-in fade-in">
            <Check className="h-4 w-4" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        {profileError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-2 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Pankaj Sharma"
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  inputMode="tel"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Business name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Rajat Enterprise / Store"
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="rounded-xl bg-gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            {isSavingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      {/* 2. Email Management Card */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <Mail className="h-4 w-4 text-purple-400" />
            <span>Email address</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Primary email address associated with your merchant workspace and notifications.
          </p>
        </div>

        {emailSuccess && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Check className="h-4 w-4" />
            <span>{emailSuccess}</span>
          </div>
        )}

        {emailError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-2 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span>{emailError}</span>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400">Current email:</span>
            <span className="text-xs font-mono font-bold text-white">{user?.email || '—'}</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
            Verified
          </span>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              New email address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingEmail || !newEmail.trim()}
            className="rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition disabled:opacity-50"
          >
            {isUpdatingEmail ? 'Updating…' : 'Update Email Address'}
          </button>
        </form>
      </section>

      {/* 3. Password & Security Card */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            <span>Password & Security</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Ensure your account is using a long, random password to stay secure (min 6 characters).
          </p>
        </div>

        {passwordSuccess && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Check className="h-4 w-4" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-2 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                New password
              </label>
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-mono"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Confirm password
              </label>
              <input
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
            className="rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition disabled:opacity-50"
          >
            {isUpdatingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* 4. Account & Subscription Card */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-400" />
            <span>Account & Workspace</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Account membership tier, role permissions, and active gateway status.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Member since</span>
            <div className="font-bold text-sm text-white flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-400" />
              <span>{memberSince}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Current plan</span>
            <div className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span>{plan?.name || 'VIP Enterprise'}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Tenant ID</span>
            <div className="font-mono text-xs text-slate-300 truncate">
              {user?.id || 'tenant_pankaj_007'}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Sign out from this browser session</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-400 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </section>

    </div>
  );
};
