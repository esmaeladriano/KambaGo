import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUser,
  loginUser,
  sendPhoneOtp,
  sendPhoneOtpWithClient,
  verifyPhoneOtp,
  verifyPhoneOtpWithClient,
  fetchMyProfile,
  fetchPublicProfilesForMatching,
  deleteMyAccount,
  mapDbProfileToUserProfile,
} from './authService';
import { getIntegrationReadiness } from '../supabase/client';
import type { DbProfileRow } from '../../types/database';
import { ptAO } from '../../locales/pt-AO';

function makeDbProfile(overrides: Partial<DbProfileRow> = {}): DbProfileRow {
  return {
    id: 'user-1',
    full_name: 'Joana Mateus',
    phone: '+244923111222',
    email: null,
    role: 'passenger',
    account_status: 'pendente',
    phone_verified: false,
    avatar_path: null,
    data_saver_enabled: false,
    intt_registration_number: null,
    intt_verification_status: 'pendente_confirmacao',
    consent_terms_at: '2026-11-20T00:00:00Z',
    consent_privacy_at: '2026-11-20T00:00:00Z',
    expo_push_token: null,
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

function makeMockSupabaseClient(options: {
  resendError?: string;
  verifyOtpError?: string;
  confirmRow?: DbProfileRow | null;
  confirmError?: string;
  myProfileRow?: DbProfileRow | null;
}) {
  return {
    auth: {
      resend: async () => ({
        data: {},
        error: options.resendError ? { message: options.resendError } : null,
      }),
      verifyOtp: async () => ({
        data: {},
        error: options.verifyOtpError ? { message: options.verifyOtpError } : null,
      }),
      getUser: async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    rpc: (fnName: string) => ({
      single: async <T>() => {
        if (fnName === 'confirm_phone_verification') {
          return {
            data: (options.confirmRow ?? null) as T | null,
            error: options.confirmError ? { message: options.confirmError } : null,
          };
        }
        if (fnName === 'get_my_profile') {
          return {
            data: (options.myProfileRow ?? options.confirmRow ?? null) as T | null,
            error: null,
          };
        }
        return { data: null, error: { message: 'RPC desconhecida' } };
      },
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: null } }),
      }),
    },
  } as unknown as Parameters<typeof verifyPhoneOtpWithClient>[0];
}

test('integration readiness reports pending configuration when env vars are absent and reads notification config dynamically', () => {
  const prev = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;

  const readiness = getIntegrationReadiness();
  assert.equal(readiness.supabaseConfigured, false);
  assert.equal(readiness.smsConfigured, false);
  assert.equal(readiness.notificationsConfigured, false);

  process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = 'eas-project-id-demo';
  assert.equal(getIntegrationReadiness().notificationsConfigured, true);

  if (prev === undefined) {
    delete process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  } else {
    process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = prev;
  }
});

test('auth operations honestly return pending_configuration without env keys', async () => {
  const reg = await registerUser({
    fullName: 'Joana Mateus',
    phone: '+244923111222',
    password: 'password123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(reg.ok, false);
  assert.equal(reg.status, 'pending_configuration');

  const login = await loginUser({
    identifier: '+244923111222',
    password: 'password123',
  });
  assert.equal(login.ok, false);
  assert.equal(login.status, 'pending_configuration');

  const otpSend = await sendPhoneOtp('+244923111222');
  assert.equal(otpSend.ok, false);
  assert.equal(otpSend.status, 'pending_configuration');

  const otpVerify = await verifyPhoneOtp({
    phone: '+244923111222',
    code: '123456',
  });
  assert.equal(otpVerify.ok, false);
  assert.equal(otpVerify.status, 'pending_configuration');

  const profile = await fetchMyProfile();
  assert.equal(profile.ok, false);
  assert.equal(profile.status, 'pending_configuration');

  const publicMatches = await fetchPublicProfilesForMatching(['user-1']);
  assert.equal(publicMatches.ok, false);
  assert.equal(publicMatches.status, 'pending_configuration');

  const del = await deleteMyAccount();
  assert.equal(del.ok, false);
  assert.equal(del.status, 'pending_configuration');
});

test('sendPhoneOtpWithClient uses Supabase Auth resend and maps unconfigured provider honestly', async () => {
  const okClient = makeMockSupabaseClient({});
  const okRes = await sendPhoneOtpWithClient(okClient, '923111222');
  assert.equal(okRes.ok, true);
  assert.equal(okRes.message, ptAO.auth.feedback.otpResent);

  const pendingClient = makeMockSupabaseClient({
    resendError: 'Unsupported phone provider',
  });
  const pendingRes = await sendPhoneOtpWithClient(pendingClient, '923111222');
  assert.equal(pendingRes.ok, false);
  assert.equal(pendingRes.status, 'pending_configuration');
  assert.equal(pendingRes.message, ptAO.setupStatus.smsMissing);
});

test('verifyPhoneOtpWithClient activates passenger only when confirm_phone_verification succeeds', async () => {
  const activePassenger = makeDbProfile({
    role: 'passenger',
    account_status: 'ativa',
    phone_verified: true,
  });
  const client = makeMockSupabaseClient({
    confirmRow: activePassenger,
    myProfileRow: activePassenger,
  });

  const res = await verifyPhoneOtpWithClient(client, {
    phone: '923111222',
    code: '123456',
  });
  assert.equal(res.ok, true);
  assert.equal(res.data?.accountStatus, 'ativa');
  assert.equal(res.data?.phoneVerified, true);
  assert.equal(res.message, ptAO.auth.feedback.otpSuccessPassengerActive);
});

test('verifyPhoneOtpWithClient fails honestly when confirm_phone_verification RPC fails', async () => {
  const client = makeMockSupabaseClient({
    confirmRow: null,
    confirmError: 'Número de telefone ainda não confirmado no servidor de autenticação.',
  });

  const res = await verifyPhoneOtpWithClient(client, {
    phone: '+244923111222',
    code: '123456',
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 'error');
  assert.equal(res.data, undefined);
});

test('verifyPhoneOtpWithClient keeps driver pending and suspended account suspended', async () => {
  const driverRow = makeDbProfile({
    role: 'driver',
    account_status: 'pendente',
    phone_verified: true,
  });
  const driverClient = makeMockSupabaseClient({
    confirmRow: driverRow,
    myProfileRow: driverRow,
  });
  const driverRes = await verifyPhoneOtpWithClient(driverClient, {
    phone: '+244923111222',
    code: '123456',
  });
  assert.equal(driverRes.ok, true);
  assert.equal(driverRes.data?.accountStatus, 'pendente');
  assert.equal(driverRes.message, ptAO.auth.feedback.otpSuccessDriverPending);

  const suspendedRow = makeDbProfile({
    role: 'passenger',
    account_status: 'suspensa',
    phone_verified: true,
  });
  const suspendedClient = makeMockSupabaseClient({
    confirmRow: suspendedRow,
    myProfileRow: suspendedRow,
  });
  const suspendedRes = await verifyPhoneOtpWithClient(suspendedClient, {
    phone: '+244923111222',
    code: '123456',
  });
  assert.equal(suspendedRes.ok, true);
  assert.equal(suspendedRes.data?.accountStatus, 'suspensa');
  assert.equal(suspendedRes.message, ptAO.auth.feedback.otpAccountSuspended);
});

test('mapDbProfileToUserProfile maps snake_case database rows accurately', () => {
  const mapped = mapDbProfileToUserProfile(
    {
      id: 'user-1',
      full_name: 'Carlos António',
      phone: '+244923555666',
      email: null,
      role: 'driver',
      account_status: 'pendente',
      phone_verified: false,
      avatar_path: 'user-1/avatar.jpg',
      data_saver_enabled: true,
      intt_registration_number: null,
      intt_verification_status: 'pendente_confirmacao',
      consent_terms_at: '2026-11-20T00:00:00Z',
      consent_privacy_at: '2026-11-20T00:00:00Z',
      expo_push_token: null,
      created_at: '2026-11-20T00:00:00Z',
      updated_at: '2026-11-20T00:00:00Z',
    },
    'https://signed.example.local/avatar.jpg'
  );

  assert.equal(mapped.fullName, 'Carlos António');
  assert.equal(mapped.accountStatus, 'pendente');
  assert.equal(mapped.dataSaverEnabled, true);
  assert.equal(mapped.inttVerificationStatus, 'pendente_confirmacao');
  assert.equal(mapped.avatarSignedUrl, 'https://signed.example.local/avatar.jpg');
});
