import { ptAO } from '../../locales/pt-AO';
import type {
  AuthActionResult,
  LoginPayload,
  OtpVerifyPayload,
  RegisterPayload,
  UserProfile,
} from '../../types/auth';
import type { DbProfileRow, PublicProfileInfoRow } from '../../types/database';
import { normalizeAngolanPhone } from '../../utils/validation';
import { getSupabaseClient } from '../supabase/client';
import { createSmsProvider } from '../sms/smsProvider';

const AVATAR_BUCKET = 'profile-avatars';
const SIGNED_URL_TTL_SECONDS = 300;

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
    avatarPath: row.avatar_path,
    avatarSignedUrl: avatarSignedUrl ?? row.avatar_url,
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
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.auth.feedback.registerPendingConfig,
    };
  }

  const normalizedPhone = normalizeAngolanPhone(payload.phone);
  const nowIso = new Date().toISOString();
  const signUpInput = payload.email
    ? {
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName,
            phone: normalizedPhone,
            role: payload.role,
            consent_terms_at: nowIso,
            consent_privacy_at: nowIso,
          },
        },
      }
    : {
        phone: normalizedPhone,
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName,
            phone: normalizedPhone,
            role: payload.role,
            consent_terms_at: nowIso,
            consent_privacy_at: nowIso,
          },
        },
      };

  const { data, error } = await supabase.auth.signUp(signUpInput);
  if (error || !data.user) {
    return {
      ok: false,
      status: 'error',
      message: error?.message ?? ptAO.setupStatus.supabaseMissing,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.registerSuccess,
    data: { userId: data.user.id },
  };
}

export async function loginUser(
  payload: LoginPayload
): Promise<AuthActionResult<UserProfile>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  const isEmail = payload.identifier.includes('@');
  const credentials = isEmail
    ? { email: payload.identifier.trim(), password: payload.password }
    : {
        phone: normalizeAngolanPhone(payload.identifier),
        password: payload.password,
      };

  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.user) {
    return {
      ok: false,
      status: 'error',
      message: error?.message ?? ptAO.auth.feedback.unauthenticatedBody,
    };
  }

  const profileResult = await fetchMyProfile();
  if (!profileResult.ok || !profileResult.data) {
    return {
      ok: false,
      status: 'error',
      message: profileResult.message,
    };
  }

  return {
    ok: true,
    status: 'success',
    message: ptAO.auth.feedback.loginSuccess,
    data: profileResult.data,
  };
}

export async function requestPasswordReset(
  identifier: string
): Promise<AuthActionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

  if (!identifier.includes('@')) {
    const sms = createSmsProvider();
    return sms.sendOtp(normalizeAngolanPhone(identifier));
  }

  const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim());
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

export async function sendPhoneOtp(phone: string): Promise<AuthActionResult> {
  const sms = createSmsProvider();
  return sms.sendOtp(normalizeAngolanPhone(phone));
}

export async function verifyPhoneOtp(
  payload: OtpVerifyPayload
): Promise<AuthActionResult> {
  const supabase = getSupabaseClient();
  const sms = createSmsProvider();
  if (!supabase || sms.providerName === 'pending') {
    return sms.verifyOtp(normalizeAngolanPhone(payload.phone), payload.code);
  }

  const { error } = await supabase.auth.verifyOtp({
    phone: normalizeAngolanPhone(payload.phone),
    token: payload.code,
    type: 'sms',
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
    message: ptAO.auth.feedback.otpSuccess,
  };
}

export async function fetchMyProfile(): Promise<AuthActionResult<UserProfile>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.supabaseMissing,
    };
  }

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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
