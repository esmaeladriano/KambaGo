import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUser,
  loginUser,
  sendPhoneOtp,
  verifyPhoneOtp,
  fetchMyProfile,
  fetchPublicProfilesForMatching,
  deleteMyAccount,
  mapDbProfileToUserProfile,
} from './authService';
import { getIntegrationReadiness } from '../supabase/client';

test('integration readiness reports pending configuration when env vars are absent', () => {
  const readiness = getIntegrationReadiness();
  assert.equal(readiness.supabaseConfigured, false);
  assert.equal(readiness.smsConfigured, false);
  assert.equal(readiness.notificationsConfigured, false);
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
      avatar_url: null,
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
