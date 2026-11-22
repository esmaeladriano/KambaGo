import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bell,
  Camera,
  FileText,
  LogOut,
  MailCheck,
  ShieldAlert,
  Trash2,
  UserCheck,
  Wifi,
} from 'lucide-react';
import { ptAO } from '../../../locales/pt-AO';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  deleteMyAccount,
  isMockAuthActive,
  signOutUser,
  updateProfilePreferences,
  uploadPrivateAvatar,
} from '../../../services/auth/authService';
import { getIntegrationReadiness } from '../../../services/supabase/client';
import { getNotificationCapabilityState } from '../../../services/notifications/notificationsService';
import {
  deleteAccountSchema,
  profileUpdateSchema,
  type DeleteAccountFormValues,
  type ProfileUpdateFormValues,
} from '../../../utils/validation';
import { getAccountStatusCopy } from '../../../utils/accountState';

export function ProfileView() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const dataSaverEnabled = useAuthStore((s) => s.dataSaverEnabled);
  const setDataSaverEnabled = useAuthStore((s) => s.setDataSaverEnabled);
  const setRoute = useAuthStore((s) => s.setRoute);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const readiness = getIntegrationReadiness();
  const mockAuthActive = isMockAuthActive();
  const notificationState = getNotificationCapabilityState();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    values: {
      fullName: profile?.fullName ?? '',
      email: profile?.email ?? '',
      dataSaverEnabled,
      inttRegistrationNumber: profile?.inttRegistrationNumber ?? '',
    },
  });

  const {
    register: registerDelete,
    handleSubmit: handleSubmitDelete,
    formState: { errors: deleteErrors, isSubmitting: isDeleting },
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmationText: '' },
  });

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
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
    if (res.ok && res.data) {
      setProfile(res.data);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!profile) {
      setStatusBanner({
        kind: 'warning',
        message: ptAO.profile.photo.pendingConfig,
      });
      return;
    }
    setUploadingAvatar(true);
    const res = await uploadPrivateAvatar(profile.id, file, file.type || 'image/jpeg');
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
    if (res.ok && res.data) {
      setProfile({
        ...profile,
        avatarPath: res.data.avatarPath,
        avatarSignedUrl: res.data.signedUrl,
      });
    }
    setUploadingAvatar(false);
  };

  const onDeleteAccount = async (_values: DeleteAccountFormValues) => {
    const res = await deleteMyAccount();
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
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

  const accountStatus = profile?.accountStatus ?? 'pendente';
  const statusCopy = getAccountStatusCopy(accountStatus);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#102A43]">{ptAO.profile.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{ptAO.profile.subtitle}</p>
          </div>
          {profile && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {ptAO.auth.actions.logout}
            </button>
          )}
        </div>

        {!profile ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-[#FFF6E5] p-4 text-sm text-[#7C4D00]">
            <p className="font-bold">{ptAO.auth.feedback.unauthenticatedTitle}</p>
            <p className="mt-1 leading-relaxed">{ptAO.auth.feedback.unauthenticatedBody}</p>
            {!readiness.supabaseConfigured && (
              <p className="mt-2 text-xs font-semibold">
                {mockAuthActive
                  ? ptAO.setupStatus.mockAuthActiveNotice
                  : ptAO.setupStatus.supabaseMissing}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRoute('login')}
                className="rounded-xl bg-[#102A43] px-3.5 py-2 text-xs font-bold text-white"
              >
                {ptAO.auth.actions.submitLogin}
              </button>
              <button
                type="button"
                onClick={() => setRoute('verify-email')}
                className="rounded-xl border border-[#7C4D00]/30 bg-white px-3.5 py-2 text-xs font-semibold text-[#7C4D00]"
              >
                {ptAO.auth.verifyEmailTitle}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <UserCheck className="h-4 w-4 text-[#0F9485]" />
                {ptAO.profile.accountStatusLabel}
              </div>
              <p className="mt-1.5 text-lg font-bold text-[#102A43]">{statusCopy.label}</p>
              <p className="mt-1 text-xs text-slate-600">{statusCopy.description}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <MailCheck className="h-4 w-4 text-[#0F9485]" />
                {ptAO.auth.verifyEmailTitle}
              </div>
              <p className="mt-1.5 text-sm font-bold text-[#102A43]">
                {profile.email ?? ptAO.common.pendingConfirmation}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {profile.emailVerified
                  ? ptAO.auth.feedback.emailVerifySuccess
                  : ptAO.auth.feedback.loginEmailNotConfirmed}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#0F9485]" />
            <h3 className="text-lg font-bold text-[#102A43]">{ptAO.profile.photo.title}</h3>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {ptAO.profile.photo.privateStorageNote}
          </p>
          {dataSaverEnabled && (
            <p className="mt-2 text-xs font-semibold text-[#0F9485]">
              {ptAO.profile.photo.compressedNote}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4">
            {profile?.avatarSignedUrl ? (
              <img
                src={profile.avatarSignedUrl}
                alt={profile.fullName}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Camera className="h-6 w-6" />
              </div>
            )}
            <label className="cursor-pointer rounded-xl bg-[#102A43] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1E3A5F]">
              {uploadingAvatar
                ? ptAO.common.loading
                : profile?.avatarPath
                  ? ptAO.profile.photo.changeCta
                  : ptAO.profile.photo.uploadCta}
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => void handleAvatarChange(e)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-[#0F9485]" />
              <h3 className="text-lg font-bold text-[#102A43]">{ptAO.profile.dataSaver.title}</h3>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dataSaverEnabled}
              onClick={() => setDataSaverEnabled(!dataSaverEnabled)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                dataSaverEnabled
                  ? 'bg-[#16B8A6] text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {dataSaverEnabled
                ? ptAO.profile.dataSaver.enabled
                : ptAO.profile.dataSaver.disabled}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {ptAO.profile.dataSaver.description}
          </p>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#0F9485]" />
              <h4 className="text-sm font-bold text-[#102A43]">
                {ptAO.profile.pushNotifications.title}
              </h4>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {ptAO.profile.pushNotifications.description}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-[#7C4D00]">
              {notificationState.reason}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSaveProfile)}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        noValidate
      >
        <h3 className="text-lg font-bold text-[#102A43]">{ptAO.profile.editTitle}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="prof-name" className="block text-sm font-semibold text-[#102A43]">
              {ptAO.auth.fields.fullName}
            </label>
            <input
              id="prof-name"
              type="text"
              {...register('fullName')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43]"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="prof-email" className="block text-sm font-semibold text-[#102A43]">
              {ptAO.auth.fields.email}
            </label>
            <input
              id="prof-email"
              type="email"
              {...register('email')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43]"
            />
            {errors.email && (
              <p className="mt-1 text-xs font-medium text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[#102A43]">{ptAO.profile.inttSection.title}</h4>
            <span className="rounded-full bg-[#FFF6E5] px-2.5 py-0.5 text-xs font-bold text-[#7C4D00]">
              {ptAO.profile.inttSection.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">{ptAO.profile.inttSection.description}</p>
          <input
            type="text"
            placeholder={ptAO.profile.inttSection.licensePlaceholder}
            {...register('inttRegistrationNumber')}
            className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#102A43]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setRoute('legal')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F9485] hover:underline"
          >
            <FileText className="h-4 w-4" />
            {ptAO.profile.legalLink}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-[#16B8A6] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F9485] disabled:opacity-60"
          >
            {isSubmitting ? ptAO.common.saving : ptAO.common.save}
          </button>
        </div>
      </form>

      <form
        onSubmit={handleSubmitDelete(onDeleteAccount)}
        className="rounded-3xl border border-red-200 bg-red-50/60 p-6 shadow-xs space-y-3"
        noValidate
      >
        <div className="flex items-center gap-2 text-red-700">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="text-lg font-bold">{ptAO.profile.deleteAccount.title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-red-800">{ptAO.profile.deleteAccount.warning}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder={ptAO.profile.deleteAccount.confirmLabel}
            {...registerDelete('confirmationText')}
            className="flex-1 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm text-[#102A43]"
          />
          <button
            type="submit"
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {ptAO.profile.deleteAccount.cta}
          </button>
        </div>
        {deleteErrors.confirmationText && (
          <p className="text-xs font-medium text-red-600">
            {deleteErrors.confirmationText.message}
          </p>
        )}
      </form>
    </div>
  );
}

export function LegalPrivacyView() {
  const setRoute = useAuthStore((s) => s.setRoute);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="rounded-xl bg-[#FFF6E5] px-4 py-2.5 text-xs font-bold text-[#7C4D00]">
        {ptAO.legal.draftNotice}
      </div>
      <h2 className="mt-4 text-2xl font-bold text-[#102A43]">{ptAO.legal.title}</h2>

      <div className="mt-6 space-y-5">
        {ptAO.legal.sections.map((section) => (
          <section key={section.title} className="space-y-1.5">
            <h3 className="text-base font-bold text-[#102A43]">{section.title}</h3>
            <p className="text-sm leading-relaxed text-slate-600">{section.body}</p>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRoute('welcome')}
        className="mt-6 rounded-xl bg-[#102A43] px-4 py-2.5 text-xs font-bold text-white"
      >
        {ptAO.common.back}
      </button>
    </div>
  );
}
