import { readAppConfig } from '../../constants/config';
import { ptAO } from '../../locales/pt-AO';
import type {
  AuthActionResult,
  EmailVerifyPayload,
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from '../../types/auth';
import type { DbProfileRow, PublicProfileInfoRow } from '../../types/database';
import { getSupabaseClient } from '../supabase/client';
import { normalizeAngolanPhone } from '../../utils/validation';

const AVATAR_BUCKET = 'profile-avatars';
const SIGNED_URL_TTL_SECONDS = 300;

function resolveAuthClient(): SupabaseAuthLike | null {
  return getSupabaseClient();
}

export function mapDbProfileToUserProfile(
  row: DbProfileRow,
  avatarSignedUrl: string | null = null
): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    accountStatus: row.account_status,
    phoneVerified: row.phone_verified,
    emailVerified: row.email_verified,
    avatarPath: row.avatar_path,
    avatarSignedUrl,
    dataSaverEnabled: row.data_saver_enabled,
    inttRegistrationNumber: row.intt_registration_number,
    inttVerificationStatus: row.intt_verification_status,
    consentTermsAt: row.consent_terms_at,
    consentPrivacyAt: row.consent_privacy_at,
    expoPushToken: row.expo_push_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function registerUser(
  payload: RegisterPayload
): Promise<AuthActionResult<{ userId: string }>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.auth.feedback.registerPendingConfig,
    };
  }

  return registerUserWithClient(supabase, payload);
}

export async function registerUserWithClient(
  supabase: SupabaseAuthLike,
  payload: RegisterPayload
): Promise<AuthActionResult<{ userId: string }>> {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = normalizeAngolanPhone(payload.phone);
  if (!/^\+2449\d{8}$/.test(normalizedPhone)) {
    return {
      ok: false,
      status: 'validation_error',
      message: ptAO.validation.phoneInvalid,
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      ok: false,
      status: 'validation_error',
      message: ptAO.validation.emailInvalid,
    };
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName.trim(),
      phone: normalizedPhone,
        role: payload.role,
        consent_terms_at: nowIso,
        consent_privacy_at: nowIso,
      },
    },
  });

  if (error || !data.user) {
    return {
      ok: false,
      status: 'error',
      message: error?.message ?? ptAO.setupStatus.supabaseMissing,
    };
  }

  // O Supabase devolve `identities: []` quando o e-mail já existe com proteção anti-enumeração ativa.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      status: 'error',
      message: ptAO.auth.feedback.emailAlreadyRegistered,
      requiresEmailVerification: true,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.registerSuccess,
    data: { userId: data.user.id },
  };
}

function isUnconfirmedEmailAuthError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('email not confirmed') || lower.includes('confirm your email');
}

export async function loginUser(
  payload: LoginPayload
): Promise<AuthActionResult<UserProfile>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  return loginUserWithClient(supabase, payload);
}

export async function loginUserWithClient(
  supabase: SupabaseAuthLike,
  payload: LoginPayload
): Promise<AuthActionResult<UserProfile>> {
  const normalizedEmail = payload.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      ok: false,
      status: 'validation_error',
      message: ptAO.validation.emailInvalid,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: payload.password,
  });

  if (error || !data.user) {
    if (isUnconfirmedEmailAuthError(error?.message)) {
      return {
        ok: false,
        status: 'error',
        message: ptAO.auth.feedback.loginEmailNotConfirmed,
        requiresEmailVerification: true,
      };
    }

    return {
      ok: false,
      status: 'error',
      message: error?.message ?? ptAO.auth.feedback.unauthenticatedBody,
    };
  }

  const profileResult = await fetchMyProfileWithClient(supabase);
  if (!profileResult.ok || !profileResult.data) {
    return {
      ok: false,
      status: 'error',
      message: profileResult.message,
    };
  }

  let profile = profileResult.data;
  if (!profile.emailVerified && data.user.email_confirmed_at) {
    const { data: syncedRow } = await supabase
      .rpc('confirm_email_verification')
      .single<DbProfileRow>();
    if (syncedRow) {
      const refreshed = await fetchMyProfileWithClient(supabase);
      profile =
        refreshed.ok && refreshed.data
          ? refreshed.data
          : mapDbProfileToUserProfile(syncedRow);
    }
  }

  if (!profile.emailVerified) {
    return {
      ok: false,
      status: 'error',
      message: ptAO.auth.feedback.loginEmailNotConfirmed,
      data: profile,
      requiresEmailVerification: true,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.loginSuccess,
    data: profile,
  };
}

export async function requestPasswordReset(
  email: string
): Promise<AuthActionResult> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return {
      ok: false,
      status: 'validation_error',
      message: ptAO.validation.emailInvalid,
    };
  }

  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
  if (error) {
    return {
      ok: false,
      status: 'error',
      message: error.message,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.forgotSent,
  };
}

export async function sendEmailAuthLink(
  email: string,
  emailRedirectTo?: string
): Promise<AuthActionResult> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.auth.feedback.emailCodePendingConfig,
    };
  }

  return sendEmailAuthLinkWithClient(supabase, email, emailRedirectTo);
}

export async function sendEmailAuthLinkWithClient(
  supabase: SupabaseAuthLike,
  email: string,
  emailRedirectTo?: string
): Promise<AuthActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      ok: false,
      status: 'validation_error',
      message: ptAO.validation.emailInvalid,
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    return {
      ok: false,
      status: 'error',
      message: error.message,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.emailLinkSent,
  };
}

export async function sendEmailVerificationCode(email: string): Promise<AuthActionResult> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.auth.feedback.emailCodePendingConfig,
    };
  }

  return sendEmailVerificationCodeWithClient(supabase, email);
}

export async function sendEmailVerificationCodeWithClient(
  supabase: SupabaseAuthLike,
  email: string
): Promise<AuthActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
  });

  if (error) {
    return {
      ok: false,
      status: 'error',
      message: error.message,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.emailCodeResent,
  };
}

export function getEmailConfirmationFeedback(
  profile: Pick<UserProfile, 'accountStatus' | 'emailVerified' | 'role'>
): string {
  if (profile.accountStatus === 'suspensa') {
    return ptAO.auth.feedback.emailVerifyAccountSuspended;
  }
  if (profile.accountStatus === 'ativa' && profile.emailVerified) {
    return profile.role === 'passenger'
      ? ptAO.auth.feedback.emailVerifySuccessPassengerActive
      : ptAO.auth.feedback.emailVerifySuccess;
  }
  if (profile.role === 'driver') {
    return ptAO.auth.feedback.emailVerifySuccessDriverPending;
  }
  return ptAO.auth.feedback.emailConfirmFailed;
}

export async function verifyEmailCode(
  payload: EmailVerifyPayload
): Promise<AuthActionResult<UserProfile>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.auth.feedback.emailCodePendingConfig,
    };
  }

  return verifyEmailCodeWithClient(supabase, payload);
}

type SupabaseAuthLike = NonNullable<ReturnType<typeof getSupabaseClient>>;

export async function verifyEmailCodeWithClient(
  supabase: SupabaseAuthLike,
  payload: EmailVerifyPayload
): Promise<AuthActionResult<UserProfile>> {
  const normalizedEmail = payload.email.trim().toLowerCase();

  const { error: otpError } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: payload.code.trim(),
    type: 'email',
  });

  if (otpError) {
    return {
      ok: false,
      status: 'error',
      message: otpError.message,
    };
  }

  const { data: confirmedRow, error: confirmError } = await supabase
    .rpc('confirm_email_verification')
    .single<DbProfileRow>();

  if (confirmError || !confirmedRow) {
    return {
      ok: false,
      status: 'error',
      message: confirmError?.message ?? ptAO.auth.feedback.emailConfirmFailed,
    };
  }

  const refreshed = await fetchMyProfileWithClient(supabase);
  const confirmedProfile =
    refreshed.ok && refreshed.data
      ? refreshed.data
      : mapDbProfileToUserProfile(confirmedRow);

  if (!confirmedProfile.emailVerified) {
    return {
      ok: false,
      status: 'error',
      message: ptAO.auth.feedback.emailConfirmFailed,
      data: confirmedProfile,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: getEmailConfirmationFeedback(confirmedProfile),
    data: confirmedProfile,
  };
}

export async function fetchMyProfile(): Promise<AuthActionResult<UserProfile>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  return fetchMyProfileWithClient(supabase);
}

export async function fetchMyProfileWithClient(
  supabase: SupabaseAuthLike
): Promise<AuthActionResult<UserProfile>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return {
      ok: false,
      status: 'error',
      message: ptAO.auth.feedback.unauthenticatedBody,
    };
  }

  const { data, error } = await supabase
    .rpc('get_my_profile')
    .single<DbProfileRow>();

  if (error || !data) {
    return {
      ok: false,
      status: 'error',
      message: error?.message ?? ptAO.auth.feedback.unauthenticatedBody,
    };
  }

  let signedUrl: string | null = null;
  if (data.avatar_path) {
    const { data: signed } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(data.avatar_path, SIGNED_URL_TTL_SECONDS);
    signedUrl = signed?.signedUrl ?? null;
  }

  return {
    ok: true,
    status: 'success',
    message: 'OK',
    data: mapDbProfileToUserProfile(data, signedUrl),
  };
}

export async function uploadPrivateAvatar(
  userId: string,
  fileBlob: Blob,
  mimeType: string
): Promise<AuthActionResult<{ avatarPath: string; signedUrl: string | null }>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.profile.photo.pendingConfig,
    };
  }

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, fileBlob, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return {
      ok: false,
      status: 'error',
      message: uploadError.message,
    };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_path: filePath })
    .eq('id', userId);

  if (updateError) {
    return {
      ok: false,
      status: 'error',
      message: updateError.message,
    };
  }

  const { data: signed } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  return {
    ok: true,
    status: 'success',
    message: ptAO.common.save,
    data: { avatarPath: filePath, signedUrl: signed?.signedUrl ?? null },
  };
}

export async function updateProfilePreferences(
  userId: string,
  updates: {
    fullName: string;
    email?: string;
    dataSaverEnabled: boolean;
    inttRegistrationNumber?: string;
  }
): Promise<AuthActionResult<UserProfile>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: updates.fullName,
      email: updates.email || null,
      data_saver_enabled: updates.dataSaverEnabled,
      intt_registration_number: updates.inttRegistrationNumber || null,
    })
    .eq('id', userId);

  if (updateError) {
    return {
      ok: false,
      status: 'error',
      message: updateError.message,
    };
  }

  const refreshed = await fetchMyProfile();
  if (!refreshed.ok || !refreshed.data) {
    return {
      ok: false,
      status: 'error',
      message: refreshed.message,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.common.save,
    data: refreshed.data,
  };
}

export async function deleteMyAccount(): Promise<AuthActionResult> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.profile.deleteAccount.pendingConfig,
    };
  }

  const { error } = await supabase.rpc('request_account_deletion');
  if (error) {
    return {
      ok: false,
      status: 'error',
      message: error.message,
    };
  }

  await supabase.auth.signOut();
  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.actions.logout,
  };
}

export async function fetchPublicProfilesForMatching(
  profileIds: string[]
): Promise<AuthActionResult<PublicProfileInfoRow[]>> {
  const supabase = resolveAuthClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  if (profileIds.length === 0) {
    return {
      ok: true,
      status: 'success',
      message: 'OK',
      data: [],
    };
  }

  const { data, error } = await supabase.rpc(
    'get_public_profiles_for_matching',
    { p_profile_ids: profileIds }
  );

  if (error) {
    return {
      ok: false,
      status: 'error',
      message: error.message,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: 'OK',
    data: (data ?? []) as PublicProfileInfoRow[],
  };
}

export async function signOutUser(): Promise<void> {
  const supabase = resolveAuthClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
