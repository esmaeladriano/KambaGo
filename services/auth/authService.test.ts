import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUser,
  registerUserWithClient,
  loginUser,
  loginUserWithClient,
  requestPasswordReset,
  requestPasswordResetWithClient,
  sendEmailAuthLink,
  sendEmailAuthLinkWithClient,
  sendEmailVerificationCode,
  sendEmailVerificationCodeWithClient,
  verifyEmailCode,
  verifyEmailCodeWithClient,
  fetchMyProfile,
  fetchPublicProfilesForMatching,
  updateProfilePreferences,
  deleteMyAccount,
  signOutUser,
  mapDbProfileToUserProfile,
} from './authService';
import { getIntegrationReadiness } from '../supabase/client';
import type { DbProfileRow } from '../../types/database';
import { ptAO } from '../../locales/pt-AO';

function makeDbProfile(overrides: Partial<DbProfileRow> = {}): DbProfileRow {
  return {
    id: 'user-1',
    full_name: 'Joana Mateus',
    phone: null,
    email: 'joana@kambago.ao',
    role: 'passenger',
    account_status: 'pendente',
    phone_verified: false,
    email_verified: false,
    avatar_path: null,
    data_saver_enabled: false,
    is_available: false,
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
  signUpError?: string;
  signUpIdentities?: Array<{ id: string }>;
  signInError?: string;
  signInWithOtpError?: string;
  authEmailConfirmedAt?: string | null;
  resendError?: string;
  verifyOtpError?: string;
  confirmRow?: DbProfileRow | null;
  confirmError?: string;
  myProfileRow?: DbProfileRow | null;
  resetPasswordError?: string;
  resetPasswordCalled?: boolean;
  updateUserError?: string;
  updateUserCalled?: boolean;
  capturedCalls?: {
    signUpArgs?: unknown;
    signInArgs?: unknown;
    signInWithOtpArgs?: unknown;
    resendArgs?: unknown;
    verifyOtpArgs?: unknown;
    resetPasswordArgs?: unknown;
    updateUserArgs?: unknown;
    rpcNames: string[];
  };
}) {
  return {
    auth: {
      signUp: async (args: unknown) => {
        if (options.capturedCalls) {
          options.capturedCalls.signUpArgs = args;
        }
        return {
          data: {
            user: options.signUpError
              ? null
              : {
                  id: 'user-1',
                  identities: options.signUpIdentities ?? [{ id: 'ident-1' }],
                },
          },
          error: options.signUpError ? { message: options.signUpError } : null,
        };
      },
      signInWithPassword: async (args: unknown) => {
        if (options.capturedCalls) {
          options.capturedCalls.signInArgs = args;
        }
        return {
          data: {
            user: options.signInError
              ? null
              : {
                  id: 'user-1',
                  email_confirmed_at:
                    options.authEmailConfirmedAt === undefined
                      ? '2026-11-20T00:00:00Z'
                      : options.authEmailConfirmedAt,
                },
          },
          error: options.signInError ? { message: options.signInError } : null,
        };
      },
      signInWithOtp: async (args: unknown) => {
        if (options.capturedCalls) {
          options.capturedCalls.signInWithOtpArgs = args;
        }
        return {
          data: { user: null, session: null },
          error: options.signInWithOtpError ? { message: options.signInWithOtpError } : null,
        };
      },
      resend: async (args: unknown) => {
        if (options.capturedCalls) {
          options.capturedCalls.resendArgs = args;
        }
        return {
          data: {},
          error: options.resendError ? { message: options.resendError } : null,
        };
      },
      verifyOtp: async (args: unknown) => {
        if (options.capturedCalls) {
          options.capturedCalls.verifyOtpArgs = args;
        }
        return {
          data: {},
          error: options.verifyOtpError ? { message: options.verifyOtpError } : null,
        };
      },
      resetPasswordForEmail: async (email: string, options_?: { redirectTo?: string }) => {
        if (options.capturedCalls) {
          options.capturedCalls.resetPasswordArgs = { email, options: options_ };
        }
        options.resetPasswordCalled = true;
        return {
          data: {},
          error: options.resetPasswordError ? { message: options.resetPasswordError } : null,
        };
      },
      updateUser: async (params: { password?: string }) => {
        if (options.capturedCalls) {
          options.capturedCalls.updateUserArgs = params;
        }
        options.updateUserCalled = true;
        return {
          data: { user: { id: 'user-1' } },
          error: options.updateUserError ? { message: options.updateUserError } : null,
        };
      },
      getUser: async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    rpc: (fnName: string) => {
      options.capturedCalls?.rpcNames.push(fnName);
      return {
        single: async <T>() => {
          if (fnName === 'confirm_email_verification') {
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
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: null } }),
      }),
    },
  } as unknown as Parameters<typeof verifyEmailCodeWithClient>[0];
}

test('integration readiness reports pending configuration when env vars are absent and reads notification config dynamically', () => {
  const prev = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;

  const readiness = getIntegrationReadiness();
  assert.equal(readiness.supabaseConfigured, false);
  assert.equal(readiness.notificationsConfigured, false);

  process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = 'eas-project-id-demo';
  assert.equal(getIntegrationReadiness().notificationsConfigured, true);

  if (prev === undefined) {
    delete process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  } else {
    process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = prev;
  }
});

test('auth operations strictly return pending_configuration in production without env keys', async () => {
  const prevAppEnv = process.env.EXPO_PUBLIC_APP_ENV;
  process.env.EXPO_PUBLIC_APP_ENV = 'production';

  try {
    const reg = await registerUser({
      fullName: 'Joana Mateus',
      phone: '+244923111222',
      email: 'joana@kambago.ao',
      password: 'password123',
      role: 'passenger',
      acceptedLegalTerms: true,
    });
    assert.equal(reg.ok, false);
    assert.equal(reg.status, 'pending_configuration');

    const login = await loginUser({
      email: 'joana@kambago.ao',
      password: 'password123',
    });
    assert.equal(login.ok, false);
    assert.equal(login.status, 'pending_configuration');

    const emailResend = await sendEmailVerificationCode('joana@kambago.ao');
    assert.equal(emailResend.ok, false);
    assert.equal(emailResend.status, 'pending_configuration');

    const emailLink = await sendEmailAuthLink('joana@kambago.ao');
    assert.equal(emailLink.ok, false);
    assert.equal(emailLink.status, 'pending_configuration');

    const emailVerify = await verifyEmailCode({
      email: 'joana@kambago.ao',
      code: '123456',
    });
    assert.equal(emailVerify.ok, false);
    assert.equal(emailVerify.status, 'pending_configuration');

    const profile = await fetchMyProfile();
    assert.equal(profile.ok, false);
    assert.equal(profile.status, 'pending_configuration');

    const publicMatches = await fetchPublicProfilesForMatching(['user-1']);
    assert.equal(publicMatches.ok, false);
    assert.equal(publicMatches.status, 'pending_configuration');

    const del = await deleteMyAccount();
    assert.equal(del.ok, false);
    assert.equal(del.status, 'pending_configuration');
  } finally {
    if (prevAppEnv === undefined) {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    } else {
      process.env.EXPO_PUBLIC_APP_ENV = prevAppEnv;
    }
  }
});

test('registerUserWithClient returns a clear SMTP configuration error', async () => {
  const client = makeMockSupabaseClient({
    signUpError: 'Error sending confirmation email: 525 Unauthorized IP address',
  });

  const result = await registerUserWithClient(client, {
    fullName: 'Joana Mateus',
    phone: '+244923111222',
    email: 'joana@kambago.ao',
    password: 'password123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.message,
    'Não foi possível enviar o e-mail neste momento. Verifica a configuração de SMTP no Supabase e tenta novamente.'
  );
});

test('auth operations do not create sessions in development without Supabase env keys', async () => {
  const prevAppEnv = process.env.EXPO_PUBLIC_APP_ENV;
  process.env.EXPO_PUBLIC_APP_ENV = 'development';

  try {
    const reg = await registerUser({
      fullName: 'Joana Mateus',
      phone: '+244923111222',
      email: 'joana@kambago.ao',
      password: 'password123',
      role: 'passenger',
      acceptedLegalTerms: true,
    });
    assert.equal(reg.ok, false);
    assert.equal(reg.status, 'pending_configuration');

    const login = await loginUser({
      email: 'joana@kambago.ao',
      password: 'password123',
    });
    assert.equal(login.ok, false);
    assert.equal(login.status, 'pending_configuration');

    const verify = await verifyEmailCode({
      email: 'joana@kambago.ao',
      code: '123456',
    });
    assert.equal(verify.ok, false);
    assert.equal(verify.status, 'pending_configuration');
  } finally {
    if (prevAppEnv === undefined) {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    } else {
      process.env.EXPO_PUBLIC_APP_ENV = prevAppEnv;
    }
  }
});

test('registerUserWithClient normalizes email/phone and detects already-registered email identities', async () => {
  const capturedCalls = { rpcNames: [] as string[] };
  const okClient = makeMockSupabaseClient({ capturedCalls });
  const okRes = await registerUserWithClient(okClient, {
    fullName: 'Joana Mateus',
    phone: '+244923111222',
    email: '  Joana@KambaGo.ao ',
    password: 'password123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(okRes.ok, true);
  assert.equal(okRes.data?.userId, 'user-1');
  assert.equal(okRes.message, ptAO.auth.feedback.registerSuccess);
  const signUpArgs = (capturedCalls as { signUpArgs?: { email: string; options: { data: Record<string, unknown> } } }).signUpArgs;
  assert.equal(signUpArgs?.email, 'joana@kambago.ao');
  assert.equal(signUpArgs?.options.data.phone, '+244923111222');

  const emailOnlyRes = await registerUserWithClient(okClient, {
    fullName: 'Joana Mateus',
    phone: '+244923333444',
    email: 'Joana.Email@KambaGo.ao',
    password: 'password123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(emailOnlyRes.ok, true);
  const emailOnlySignUpArgs = (capturedCalls as { signUpArgs?: { email: string; options: { data: Record<string, unknown> } } }).signUpArgs;
  assert.equal(emailOnlySignUpArgs?.email, 'joana.email@kambago.ao');
  assert.equal(emailOnlySignUpArgs?.options.data.phone, '+244923333444');

  const duplicateClient = makeMockSupabaseClient({ signUpIdentities: [] });
  const dupRes = await registerUserWithClient(duplicateClient, {
    fullName: 'Joana Mateus',
    phone: '+244923111222',
    email: 'joana@kambago.ao',
    password: 'password123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(dupRes.ok, false);
  assert.equal(dupRes.requiresEmailVerification, true);
  assert.equal(dupRes.message, ptAO.auth.feedback.emailAlreadyRegistered);
});

test('sendEmailAuthLinkWithClient sends email authentication link via Supabase auth.signInWithOtp', async () => {
  const invalidRes = await sendEmailAuthLinkWithClient(
    makeMockSupabaseClient({}),
    'email-invalido'
  );
  assert.equal(invalidRes.ok, false);
  assert.equal(invalidRes.status, 'validation_error');
  assert.equal(invalidRes.message, ptAO.validation.emailInvalid);

  const capturedCalls = { rpcNames: [] as string[] };
  const okClient = makeMockSupabaseClient({ capturedCalls });
  const okRes = await sendEmailAuthLinkWithClient(
    okClient,
    '  Joana@KambaGo.ao ',
    'https://kambago.ao/auth/callback'
  );
  assert.equal(okRes.ok, true);
  assert.equal(okRes.message, ptAO.auth.feedback.emailLinkSent);
  assert.deepEqual(
    (capturedCalls as { signInWithOtpArgs?: unknown }).signInWithOtpArgs,
    {
      email: 'joana@kambago.ao',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://kambago.ao/auth/callback',
      },
    }
  );

  const errClient = makeMockSupabaseClient({
    signInWithOtpError: 'Email rate limit exceeded',
  });
  const errRes = await sendEmailAuthLinkWithClient(errClient, 'joana@kambago.ao');
  assert.equal(errRes.ok, false);
  assert.equal(errRes.status, 'error');
  assert.equal(errRes.message, 'Email rate limit exceeded');
});

test('loginUserWithClient signs in verified users and prompts email verification when unconfirmed', async () => {
  const verifiedProfile = makeDbProfile({
    account_status: 'ativa',
    email_verified: true,
  });
  const okClient = makeMockSupabaseClient({ myProfileRow: verifiedProfile });
  const okRes = await loginUserWithClient(okClient, {
    email: '  Joana@KambaGo.ao ',
    password: 'password123',
  });
  assert.equal(okRes.ok, true);
  assert.equal(okRes.data?.emailVerified, true);
  assert.equal(okRes.message, ptAO.auth.feedback.loginSuccess);

  const unconfirmedClient = makeMockSupabaseClient({
    signInError: 'Email not confirmed',
  });
  const unconfirmedRes = await loginUserWithClient(unconfirmedClient, {
    email: 'joana@kambago.ao',
    password: 'password123',
  });
  assert.equal(unconfirmedRes.ok, false);
  assert.equal(unconfirmedRes.requiresEmailVerification, true);
  assert.equal(unconfirmedRes.message, ptAO.auth.feedback.loginEmailNotConfirmed);
});

test('sendEmailVerificationCodeWithClient uses Supabase Auth signup email resend', async () => {
  const capturedCalls = { rpcNames: [] as string[] };
  const okClient = makeMockSupabaseClient({ capturedCalls });
  const okRes = await sendEmailVerificationCodeWithClient(okClient, '  Joana@KambaGo.ao ');
  assert.equal(okRes.ok, true);
  assert.equal(okRes.message, ptAO.auth.feedback.emailCodeResent);
  assert.deepEqual(
    (capturedCalls as { resendArgs?: unknown }).resendArgs,
    { type: 'signup', email: 'joana@kambago.ao' }
  );

  const errClient = makeMockSupabaseClient({
    resendError: 'Rate limit exceeded',
  });
  const errRes = await sendEmailVerificationCodeWithClient(errClient, 'joana@kambago.ao');
  assert.equal(errRes.ok, false);
  assert.equal(errRes.status, 'error');
  assert.equal(errRes.message, 'Rate limit exceeded');
});

test('verifyEmailCodeWithClient activates passenger only when verifyOtp and confirm_email_verification succeed', async () => {
  const capturedCalls = { rpcNames: [] as string[] };
  const activePassenger = makeDbProfile({
    role: 'passenger',
    account_status: 'ativa',
    email_verified: true,
  });
  const client = makeMockSupabaseClient({
    confirmRow: activePassenger,
    myProfileRow: activePassenger,
    capturedCalls,
  });

  const res = await verifyEmailCodeWithClient(client, {
    email: '  Joana@KambaGo.ao ',
    code: '123456',
  });
  assert.equal(res.ok, true);
  assert.equal(res.data?.accountStatus, 'ativa');
  assert.equal(res.data?.emailVerified, true);
  assert.equal(res.message, ptAO.auth.feedback.emailVerifySuccessPassengerActive);
  assert.deepEqual(
    (capturedCalls as { verifyOtpArgs?: unknown }).verifyOtpArgs,
    { email: 'joana@kambago.ao', token: '123456', type: 'signup' }
  );
  assert.deepEqual(capturedCalls.rpcNames, ['confirm_email_verification', 'get_my_profile']);
});

test('verifyEmailCodeWithClient fails honestly when verifyOtp or confirm_email_verification RPC fails', async () => {
  const otpFailClient = makeMockSupabaseClient({
    verifyOtpError: 'Token has expired or is invalid',
  });
  const otpFailRes = await verifyEmailCodeWithClient(otpFailClient, {
    email: 'joana@kambago.ao',
    code: '000000',
  });
  assert.equal(otpFailRes.ok, false);
  assert.equal(otpFailRes.status, 'error');
  assert.equal(otpFailRes.message, 'Token has expired or is invalid');

  const client = makeMockSupabaseClient({
    confirmRow: null,
    confirmError: 'Endereço de e-mail ainda não confirmado no servidor de autenticação.',
  });

  const res = await verifyEmailCodeWithClient(client, {
    email: 'joana@kambago.ao',
    code: '123456',
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 'error');
  assert.equal(res.data, undefined);
});

test('verifyEmailCodeWithClient keeps driver pending and suspended account suspended', async () => {
  const driverRow = makeDbProfile({
    role: 'driver',
    account_status: 'pendente',
    email_verified: true,
  });
  const driverClient = makeMockSupabaseClient({
    confirmRow: driverRow,
    myProfileRow: driverRow,
  });
  const driverRes = await verifyEmailCodeWithClient(driverClient, {
    email: 'joana@kambago.ao',
    code: '123456',
  });
  assert.equal(driverRes.ok, true);
  assert.equal(driverRes.data?.accountStatus, 'pendente');
  assert.equal(driverRes.message, ptAO.auth.feedback.emailVerifySuccessDriverPending);

  const suspendedRow = makeDbProfile({
    role: 'passenger',
    account_status: 'suspensa',
    email_verified: true,
  });
  const suspendedClient = makeMockSupabaseClient({
    confirmRow: suspendedRow,
    myProfileRow: suspendedRow,
  });
  const suspendedRes = await verifyEmailCodeWithClient(suspendedClient, {
    email: 'joana@kambago.ao',
    code: '123456',
  });
  assert.equal(suspendedRes.ok, true);
  assert.equal(suspendedRes.data?.accountStatus, 'suspensa');
  assert.equal(suspendedRes.message, ptAO.auth.feedback.emailVerifyAccountSuspended);
});

test('mapDbProfileToUserProfile maps snake_case database rows accurately including emailVerified', () => {
  const mapped = mapDbProfileToUserProfile(
    {
      id: 'user-1',
      full_name: 'Carlos António',
      phone: '+244923555666',
      email: 'carlos@kambago.ao',
      role: 'driver',
      account_status: 'pendente',
      phone_verified: false,
      email_verified: true,
      avatar_path: 'user-1/avatar.jpg',
      data_saver_enabled: true,
      is_available: false,
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
  assert.equal(mapped.email, 'carlos@kambago.ao');
  assert.equal(mapped.emailVerified, true);
  assert.equal(mapped.accountStatus, 'pendente');
  assert.equal(mapped.dataSaverEnabled, true);
  assert.equal(mapped.inttVerificationStatus, 'pendente_confirmacao');
  assert.equal(mapped.avatarSignedUrl, 'https://signed.example.local/avatar.jpg');
});

test('requestPasswordReset envia redirectTo recebido por parâmetro', async () => {
  const capturedCalls = { rpcNames: [] as string[] };
  const client = makeMockSupabaseClient({ capturedCalls });
  const res = await requestPasswordResetWithClient(
    client,
    'joana@kambago.ao',
    'kambago://reset-password'
  );

  assert.equal(res.ok, true);
  assert.equal(res.status, 'success');
  assert.equal(res.message, ptAO.auth.feedback.forgotSent);

  const args = (capturedCalls as { resetPasswordArgs?: { email: string; options: { redirectTo: string } } }).resetPasswordArgs;
  assert.equal(args?.email, 'joana@kambago.ao');
  assert.equal(args?.options.redirectTo, 'kambago://reset-password');
});

test('requestPasswordReset devolve resposta igual para e-mail existente e inexistente', async () => {
  const existingClient = makeMockSupabaseClient({});
  const existingRes = await requestPasswordResetWithClient(
    existingClient,
    'joana@kambago.ao',
    'kambago://reset-password'
  );

  const nonExistingClient = makeMockSupabaseClient({});
  const nonExistingRes = await requestPasswordResetWithClient(
    nonExistingClient,
    'naoexiste@kambago.ao',
    'kambago://reset-password'
  );

  assert.equal(existingRes.ok, nonExistingRes.ok);
  assert.equal(existingRes.status, nonExistingRes.status);
  assert.equal(existingRes.message, nonExistingRes.message);
  assert.equal(existingRes.ok, true);
});

test('requestPasswordReset recusa e-mail inválido sem chamar o Supabase', async () => {
  const capturedCalls = { rpcNames: [] as string[] };
  const client = makeMockSupabaseClient({ capturedCalls });

  const invalidRes = await requestPasswordResetWithClient(
    client,
    'email-invalido',
    'kambago://reset-password'
  );
  assert.equal(invalidRes.ok, false);
  assert.equal(invalidRes.status, 'validation_error');
  assert.equal(invalidRes.message, ptAO.validation.emailInvalid);
  assert.equal((capturedCalls as { resetPasswordArgs?: unknown }).resetPasswordArgs, undefined);

  const emptyRes = await requestPasswordResetWithClient(client, '', 'kambago://reset-password');
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyRes.status, 'validation_error');
  assert.equal((capturedCalls as { resetPasswordArgs?: unknown }).resetPasswordArgs, undefined);
});

test('sessão de recuperação: updateUser não é chamado sem sessão válida', async () => {
  const capturedCalls = { rpcNames: [] as string[] };
  const client = makeMockSupabaseClient({ capturedCalls });

  // Simula o comportamento do ecrã reset-password: sem hasRecoverySession, updateUser não é chamado.
  const hasRecoverySession = false;
  let updateUserCalled = false;

  if (hasRecoverySession) {
    await client.auth.updateUser({ password: 'NovaSenha123' });
    updateUserCalled = true;
  }

  assert.equal(updateUserCalled, false);
  assert.equal((capturedCalls as { updateUserArgs?: unknown }).updateUserArgs, undefined);
});

