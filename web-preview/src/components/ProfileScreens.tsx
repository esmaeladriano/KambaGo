import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  FileText,
  Trash2,
  LogOut,
  Wifi,
  BellOff,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { ptAO } from '../../../locales/pt-AO';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  deleteAccountSchema,
  profileUpdateSchema,
  type DeleteAccountFormValues,
  type ProfileUpdateFormValues,
} from '../../../utils/validation';
import {
  deleteMyAccount,
  signOutUser,
  updateProfilePreferences,
  uploadPrivateAvatar,
} from '../../../services/auth/authService';
import { getIntegrationReadiness } from '../../../services/supabase/client';
import { getNotificationCapabilityState } from '../../../services/notifications/notificationsService';
import { formatAngolanPhoneDisplay, getAccountStatusCopy } from '../../../utils/accountState';

export function ProfileView() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const dataSaverEnabled = useAuthStore((s) => s.dataSaverEnabled);
  const setDataSaverEnabled = useAuthStore((s) => s.setDataSaverEnabled);
  const setRoute = useAuthStore((s) => s.setRoute);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);
  const banner = useAuthStore((s) => s.statusBanner);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<string | null>(null);
  const readiness = getIntegrationReadiness();
  const notifications = getNotificationCapabilityState();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSavingProfile },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: profile?.fullName ?? '',
      email: profile?.email ?? '',
      dataSaverEnabled,
      inttRegistrationNumber: profile?.inttRegistrationNumber ?? '',
    },
  });

  const {
    register: registerDelete,
    handleSubmit: handleDeleteSubmit,
    formState: { errors: deleteErrors, isSubmitting: isDeleting },
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmationText: '' },
  });

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!readiness.supabaseConfigured || !profile) {
      setAvatarFeedback(ptAO.profile.photo.pendingConfig);
      return;
    }

    const res = await uploadPrivateAvatar(profile.id, file, file.type);
    setAvatarFeedback(res.message);
    if (res.ok && res.data) {
      setProfile({
        ...profile,
        avatarPath: res.data.avatarPath,
        avatarSignedUrl: res.data.signedUrl,
      });
    }
  };

  const onSaveProfile = async (values: ProfileUpdateFormValues) => {
    setDataSaverEnabled(values.dataSaverEnabled);
    if (!profile) {
      setStatusBanner({
        kind: 'warning',
        message: ptAO.setupStatus.supabaseMissing,
      });
      return;
    }

    const res = await updateProfilePreferences(profile.id, values);
    if (res.ok && res.data) {
      setProfile(res.data);
      setStatusBanner({ kind: 'success', message: res.message });
    } else {
      setStatusBanner({ kind: 'error', message: res.message });
    }
  };

  const onConfirmDelete = async () => {
    const res = await deleteMyAccount();
    setStatusBanner({
      kind: res.ok ? 'success' : 'warning',
      message: res.message,
    });
    if (res.ok) {
      setProfile(null);
      setRoute('welcome');
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setProfile(null);
    setRoute('welcome');
  };

  const statusCopy = getAccountStatusCopy(profile?.accountStatus ?? 'pendente');

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-[#102A43]">
              {ptAO.profile.title}
            </h2>
            <p className="text-sm text-slate-600">{ptAO.profile.subtitle}</p>
          </div>
          {profile && (
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{ptAO.auth.actions.logout}</span>
            </button>
          )}
        </div>

        {banner && (
          <div
            role="status"
            className="rounded-xl border border-[#FFB547]/50 bg-[#FFF6E5] p-3.5 text-xs text-[#7C4D00] flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{banner.message}</span>
          </div>
        )}

        {!profile && (
          <div className="rounded-xl bg-[#F7FAFC] p-4 space-y-2">
            <p className="text-sm font-semibold text-[#102A43]">
              {ptAO.auth.feedback.unauthenticatedTitle}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {readiness.supabaseConfigured
                ? ptAO.auth.feedback.unauthenticatedBody
                : ptAO.setupStatus.supabaseMissing}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRoute('login')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#16B8A6] text-white text-xs font-semibold cursor-pointer"
              >
                {ptAO.auth.actions.submitLogin}
              </button>
              <button
                type="button"
                onClick={() => setRoute('register')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#102A43] text-xs font-semibold cursor-pointer"
              >
                {ptAO.auth.actions.submitRegister}
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-[#F1F5F9] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#102A43] text-white flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatarSignedUrl ? (
                <img
                  src={profile.avatarSignedUrl}
                  alt={profile.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-6 h-6 text-[#16B8A6]" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#102A43]">
                {profile ? profile.fullName : ptAO.profile.photo.title}
              </p>
              <p className="text-xs text-slate-500">
                {profile
                  ? `${profile.email ? `${profile.email} · ` : ''}${profile.phone ? `${formatAngolanPhoneDisplay(profile.phone)} · ` : ''}${ptAO.profile.roles[profile.role]}`
                  : ptAO.profile.photo.privateStorageNote}
              </p>
            </div>
          </div>

          <label className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#102A43] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0">
            <Camera className="w-4 h-4" />
            <span>{ptAO.profile.photo.uploadCta}</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarSelected}
              className="sr-only"
            />
          </label>
        </div>

        {avatarFeedback && (
          <p className="text-xs text-[#7C4D00] bg-[#FFF6E5] rounded-lg p-2.5">
            {avatarFeedback}
          </p>
        )}

        <div className="border-t border-[#F1F5F9] pt-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">{ptAO.profile.accountStatusLabel}</p>
            <p className="text-sm font-semibold text-[#102A43]">
              {statusCopy.label}{' '}
              <span className="font-normal text-slate-600">· {statusCopy.description}</span>
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleProfileSubmit(onSaveProfile)}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
      >
        <h3 className="font-display text-base font-bold text-[#102A43]">
          {ptAO.profile.editTitle}
        </h3>

        {profile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="prof-name" className="block text-xs font-medium text-[#102A43]">
                {ptAO.auth.fields.fullName}
              </label>
              <input
                id="prof-name"
                type="text"
                {...registerProfile('fullName')}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm"
              />
              {profileErrors.fullName && (
                <p className="text-xs text-red-600">{profileErrors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-email" className="block text-xs font-medium text-[#102A43]">
                {ptAO.auth.fields.email}
              </label>
              <input
                id="prof-email"
                type="email"
                {...registerProfile('email')}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm"
              />
            </div>
          </div>
        )}

        <div className="rounded-xl bg-[#F7FAFC] p-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#16B8A6]" />
              <p className="text-sm font-semibold text-[#102A43]">
                {ptAO.profile.dataSaver.title}
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {ptAO.profile.dataSaver.description}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={dataSaverEnabled}
            aria-label={ptAO.profile.dataSaver.title}
            onClick={() => setDataSaverEnabled(!dataSaverEnabled)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              dataSaverEnabled
                ? 'bg-[#16B8A6] text-white'
                : 'bg-[#F1F5F9] text-slate-700'
            }`}
          >
            {dataSaverEnabled
              ? ptAO.profile.dataSaver.enabled
              : ptAO.profile.dataSaver.disabled}
          </button>
        </div>

        <div className="rounded-xl bg-[#F7FAFC] p-4 flex items-start gap-3">
          <BellOff className="w-4 h-4 text-[#FFB547] mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#102A43]">
              {ptAO.profile.pushNotifications.title} ·{' '}
              <span className="text-[#7C4D00]">{notifications.reason}</span>
            </p>
            <p className="text-xs text-slate-600">
              {ptAO.profile.pushNotifications.description}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#F7FAFC] p-4 space-y-2">
          <p className="text-sm font-semibold text-[#102A43]">
            {ptAO.profile.inttSection.title} ·{' '}
            <span className="text-[#7C4D00]">{ptAO.profile.inttSection.status}</span>
          </p>
          <p className="text-xs text-slate-600">
            {ptAO.profile.inttSection.description}
          </p>
          <input
            type="text"
            disabled
            placeholder={ptAO.profile.inttSection.licensePlaceholder}
            className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed"
          />
        </div>

        {profile && (
          <button
            type="submit"
            disabled={isSavingProfile}
            className="w-full min-h-[44px] rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] text-white text-sm font-semibold cursor-pointer"
          >
            {isSavingProfile ? ptAO.common.saving : ptAO.common.save}
          </button>
        )}
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <button
          type="button"
          onClick={() => setRoute('legal')}
          className="w-full min-h-[44px] px-3 py-2 rounded-xl hover:bg-[#F1F5F9] flex items-center justify-between text-sm font-medium text-[#102A43] cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#16B8A6]" />
            <span>{ptAO.profile.legalLink}</span>
          </span>
          <span className="text-xs text-slate-500">{ptAO.common.legalDraftBadge}</span>
        </button>

        <div className="border-t border-[#F1F5F9] pt-3">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl hover:bg-red-50 flex items-center gap-2.5 text-sm font-medium text-red-700 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{ptAO.profile.deleteAccount.title}</span>
            </button>
          ) : (
            <form onSubmit={handleDeleteSubmit(onConfirmDelete)} className="space-y-3 pt-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                {ptAO.profile.deleteAccount.warning}
              </p>
              <div className="space-y-1">
                <label
                  htmlFor="delete-confirm"
                  className="block text-xs font-semibold text-red-700"
                >
                  {ptAO.profile.deleteAccount.confirmLabel}
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  {...registerDelete('confirmationText')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-red-200 bg-red-50/40 text-sm"
                />
                {deleteErrors.confirmationText && (
                  <p className="text-xs text-red-600">
                    {deleteErrors.confirmationText.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {ptAO.profile.deleteAccount.cta}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F5F9] text-slate-700 text-xs font-medium cursor-pointer"
                >
                  {ptAO.common.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function LegalPrivacyView() {
  const setRoute = useAuthStore((s) => s.setRoute);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setRoute('welcome')}
          className="min-h-[44px] px-3 py-2 rounded-xl hover:bg-[#F1F5F9] text-sm font-medium text-[#102A43] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{ptAO.common.back}</span>
        </button>
        <span className="text-xs font-semibold text-[#7C4D00]">
          {ptAO.common.legalDraftBadge}
        </span>
      </div>

      <div className="rounded-xl bg-[#FFF6E5] border border-[#FFB547]/50 p-4 text-xs text-[#7C4D00] font-medium">
        {ptAO.legal.draftNotice}
      </div>

      <h2 className="font-display text-xl font-bold text-[#102A43]">{ptAO.legal.title}</h2>

      <div className="space-y-4">
        {ptAO.legal.sections.map((section) => (
          <section key={section.title} className="space-y-1 border-b border-[#F1F5F9] pb-4 last:border-b-0 last:pb-0">
            <h3 className="text-sm font-bold text-[#102A43]">{section.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
