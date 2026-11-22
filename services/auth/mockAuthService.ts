import type { AccountStatus, UserRole } from '../../types/auth';
import type { DbProfileRow, PublicProfileInfoRow } from '../../types/database';

export const MOCK_EMAIL_VERIFICATION_CODE = '123456';

interface MockUserRecord {
  id: string;
  email: string;
  password: string;
  emailConfirmedAt: string | null;
  pendingCode: string;
  profile: DbProfileRow;
}

const usersById = new Map<string, MockUserRecord>();
const userIdByEmail = new Map<string, string>();
const avatarUrlsByPath = new Map<string, string>();

let activeUserId: string | null = null;
let userSequence = 1;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneProfile(profile: DbProfileRow): DbProfileRow {
  return { ...profile };
}

export function resetMockAuthState(): void {
  usersById.clear();
  userIdByEmail.clear();
  avatarUrlsByPath.clear();
  activeUserId = null;
  userSequence = 1;
}

export function seedMockUserForTests(options: {
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
  accountStatus?: AccountStatus;
  emailVerified?: boolean;
}): DbProfileRow {
  const email = normalizeEmail(options.email);
  const id = `mock-user-${userSequence++}`;
  const timestamp = nowIso();
  const emailVerified = options.emailVerified ?? false;
  const profile: DbProfileRow = {
    id,
    full_name: options.fullName ?? 'Utilizador KambaGo',
    phone: null,
    email,
    role: options.role ?? 'passenger',
    account_status: options.accountStatus ?? (emailVerified && options.role !== 'driver' ? 'ativa' : 'pendente'),
    phone_verified: false,
    email_verified: emailVerified,
    avatar_path: null,
    data_saver_enabled: false,
    intt_registration_number: null,
    intt_verification_status: 'pendente_confirmacao',
    consent_terms_at: timestamp,
    consent_privacy_at: timestamp,
    expo_push_token: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  usersById.set(id, {
    id,
    email,
    password: options.password,
    emailConfirmedAt: emailVerified ? timestamp : null,
    pendingCode: MOCK_EMAIL_VERIFICATION_CODE,
    profile,
  });
  userIdByEmail.set(email, id);
  return cloneProfile(profile);
}

interface RpcResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

function createRpcResult<T>(executor: () => RpcResponse<T>) {
  const promise = Promise.resolve().then(executor);
  return {
    then: promise.then.bind(promise),
    single: <S = T>() => promise as unknown as Promise<RpcResponse<S>>,
  };
}

export function getMockSupabaseAuthClient() {
  return {
    auth: {
      async signUp(params: {
        email: string;
        password: string;
        options?: {
          data?: {
            full_name?: string;
            role?: 'passenger' | 'driver';
            consent_terms_at?: string;
            consent_privacy_at?: string;
          };
        };
      }) {
        const email = normalizeEmail(params.email);
        if (userIdByEmail.has(email)) {
          return {
            data: {
              user: {
                id: userIdByEmail.get(email)!,
                identities: [],
              },
            },
            error: null,
          };
        }

        const id = `mock-user-${userSequence++}`;
        const timestamp = nowIso();
        const role: UserRole = params.options?.data?.role === 'driver' ? 'driver' : 'passenger';

        const profile: DbProfileRow = {
          id,
          full_name: params.options?.data?.full_name?.trim() || 'Utilizador KambaGo',
          phone: null,
          email,
          role,
          account_status: 'pendente',
          phone_verified: false,
          email_verified: false,
          avatar_path: null,
          data_saver_enabled: false,
          intt_registration_number: null,
          intt_verification_status: 'pendente_confirmacao',
          consent_terms_at: params.options?.data?.consent_terms_at ?? timestamp,
          consent_privacy_at: params.options?.data?.consent_privacy_at ?? timestamp,
          expo_push_token: null,
          created_at: timestamp,
          updated_at: timestamp,
        };

        usersById.set(id, {
          id,
          email,
          password: params.password,
          emailConfirmedAt: null,
          pendingCode: MOCK_EMAIL_VERIFICATION_CODE,
          profile,
        });
        userIdByEmail.set(email, id);

        return {
          data: {
            user: {
              id,
              identities: [{ id: `mock-ident-${id}` }],
            },
          },
          error: null,
        };
      },

      async signInWithPassword(params: { email: string; password: string }) {
        const email = normalizeEmail(params.email);
        const userId = userIdByEmail.get(email);
        const record = userId ? usersById.get(userId) : undefined;

        if (!record || record.password !== params.password) {
          return {
            data: { user: null },
            error: { message: 'Invalid login credentials' },
          };
        }

        if (!record.emailConfirmedAt) {
          return {
            data: { user: null },
            error: { message: 'Email not confirmed' },
          };
        }

        activeUserId = record.id;
        return {
          data: {
            user: {
              id: record.id,
              email_confirmed_at: record.emailConfirmedAt,
            },
          },
          error: null,
        };
      },

      async resetPasswordForEmail(_email: string) {
        return { error: null };
      },

      async signInWithOtp(params: {
        email: string;
        options?: { shouldCreateUser?: boolean; emailRedirectTo?: string };
      }) {
        const email = normalizeEmail(params.email);
        if (!userIdByEmail.has(email) && params.options?.shouldCreateUser) {
          const id = `mock-user-${userSequence++}`;
          const timestamp = nowIso();
          const profile: DbProfileRow = {
            id,
            full_name: email.split('@')[0] || 'Utilizador KambaGo',
            phone: null,
            email,
            role: 'passenger',
            account_status: 'pendente',
            phone_verified: false,
            email_verified: false,
            avatar_path: null,
            data_saver_enabled: false,
            intt_registration_number: null,
            intt_verification_status: 'pendente_confirmacao',
            consent_terms_at: timestamp,
            consent_privacy_at: timestamp,
            expo_push_token: null,
            created_at: timestamp,
            updated_at: timestamp,
          };
          usersById.set(id, {
            id,
            email,
            password: '',
            emailConfirmedAt: null,
            pendingCode: MOCK_EMAIL_VERIFICATION_CODE,
            profile,
          });
          userIdByEmail.set(email, id);
        } else if (userIdByEmail.has(email)) {
          const record = usersById.get(userIdByEmail.get(email)!);
          if (record) {
            record.pendingCode = MOCK_EMAIL_VERIFICATION_CODE;
          }
        }
        return { data: { user: null, session: null }, error: null };
      },

      async resend(params: { type: string; email: string }) {
        const email = normalizeEmail(params.email);
        const userId = userIdByEmail.get(email);
        const record = userId ? usersById.get(userId) : undefined;
        if (record) {
          record.pendingCode = MOCK_EMAIL_VERIFICATION_CODE;
        }
        return { data: {}, error: null };
      },

      async verifyOtp(params: { email: string; token: string; type: string }) {
        const email = normalizeEmail(params.email);
        const userId = userIdByEmail.get(email);
        const record = userId ? usersById.get(userId) : undefined;

        if (!record || params.token.trim() !== record.pendingCode) {
          return {
            data: {},
            error: { message: 'Token has expired or is invalid' },
          };
        }

        record.emailConfirmedAt = record.emailConfirmedAt ?? nowIso();
        activeUserId = record.id;
        return { data: {}, error: null };
      },

      async getUser() {
        if (!activeUserId || !usersById.has(activeUserId)) {
          return { data: { user: null }, error: null };
        }
        return { data: { user: { id: activeUserId } }, error: null };
      },

      async signOut() {
        activeUserId = null;
        return { error: null };
      },
    },

    rpc(fnName: string, params?: Record<string, unknown>) {
      if (fnName === 'confirm_email_verification') {
        return createRpcResult<DbProfileRow>(() => {
          const record = activeUserId ? usersById.get(activeUserId) : undefined;
          if (!record || !record.emailConfirmedAt) {
            return {
              data: null,
              error: { message: 'E-mail ainda não confirmado no servidor de autenticação.' },
            };
          }

          let nextStatus = record.profile.account_status;
          if (nextStatus !== 'suspensa') {
            if (record.profile.role === 'driver') {
              nextStatus = nextStatus === 'ativa' ? 'ativa' : 'pendente';
            } else {
              nextStatus = 'ativa';
            }
          }

          record.profile = {
            ...record.profile,
            email_verified: true,
            account_status: nextStatus,
            updated_at: nowIso(),
          };
          return { data: cloneProfile(record.profile), error: null };
        });
      }

      if (fnName === 'get_my_profile') {
        return createRpcResult<DbProfileRow>(() => {
          const record = activeUserId ? usersById.get(activeUserId) : undefined;
          if (!record) {
            return { data: null, error: { message: 'Perfil não encontrado.' } };
          }
          return { data: cloneProfile(record.profile), error: null };
        });
      }

      if (fnName === 'request_account_deletion') {
        return createRpcResult<null>(() => {
          if (!activeUserId || !usersById.has(activeUserId)) {
            return { data: null, error: { message: 'Autenticação obrigatória.' } };
          }
          const record = usersById.get(activeUserId)!;
          if (record.profile.email) {
            userIdByEmail.delete(record.profile.email);
          }
          usersById.delete(activeUserId);
          activeUserId = null;
          return { data: null, error: null };
        });
      }

      if (fnName === 'get_public_profiles_for_matching') {
        return createRpcResult<PublicProfileInfoRow[]>(() => {
          const ids = Array.isArray(params?.p_profile_ids)
            ? (params.p_profile_ids as string[])
            : [];
          const matched: PublicProfileInfoRow[] = [];
          for (const id of ids) {
            const record = usersById.get(id);
            if (record) {
              matched.push({
                id: record.profile.id,
                full_name: record.profile.full_name,
                avatar_path: record.profile.avatar_path,
              });
            }
          }
          return { data: matched, error: null };
        });
      }

      return createRpcResult<null>(() => ({
        data: null,
        error: { message: `RPC simulada desconhecida: ${fnName}` },
      }));
    },

    storage: {
      from(_bucket: string) {
        return {
          async upload(filePath: string, fileBlob: Blob) {
            if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
              avatarUrlsByPath.set(filePath, URL.createObjectURL(fileBlob));
            } else {
              avatarUrlsByPath.set(filePath, `mock://storage/${filePath}`);
            }
            return { error: null };
          },
          async createSignedUrl(filePath: string) {
            return {
              data: {
                signedUrl: avatarUrlsByPath.get(filePath) ?? null,
              },
            };
          },
        };
      },
    },

    from(table: string) {
      return {
        update(patch: Partial<DbProfileRow>) {
          return {
            async eq(column: string, value: string) {
              if (table !== 'profiles' || column !== 'id') {
                return { error: { message: 'Operação não suportada em modo mock.' } };
              }
              const record = usersById.get(value);
              if (!record) {
                return { error: { message: 'Perfil não encontrado.' } };
              }

              const nextEmail =
                patch.email !== undefined
                  ? patch.email
                    ? normalizeEmail(patch.email)
                    : null
                  : record.profile.email;

              if (record.profile.email && record.profile.email !== nextEmail) {
                userIdByEmail.delete(record.profile.email);
              }
              if (nextEmail) {
                userIdByEmail.set(nextEmail, record.id);
                record.email = nextEmail;
              }

              record.profile = {
                ...record.profile,
                ...(patch.full_name !== undefined ? { full_name: patch.full_name } : {}),
                ...(patch.email !== undefined ? { email: nextEmail } : {}),
                ...(patch.data_saver_enabled !== undefined
                  ? { data_saver_enabled: patch.data_saver_enabled }
                  : {}),
                ...(patch.intt_registration_number !== undefined
                  ? { intt_registration_number: patch.intt_registration_number }
                  : {}),
                ...(patch.avatar_path !== undefined
                  ? { avatar_path: patch.avatar_path }
                  : {}),
                updated_at: nowIso(),
              };

              return { error: null };
            },
          };
        },
      };
    },
  };
}
