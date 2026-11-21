import test from 'node:test';
import assert from 'node:assert/strict';
import { preferencesStorage, supabaseAuthStorage, type DeviceKeyValueStorage } from './deviceStorage';
import {
  createChunkedSecureStorage,
  SECURE_STORE_MAX_BYTES,
  utf8ByteLength,
} from './chunkedStorage';
import { useAuthStore } from '../../store/useAuthStore';

function createStrictSecureStoreMock(maxBytes = SECURE_STORE_MAX_BYTES) {
  const store = new Map<string, string>();
  const storage: DeviceKeyValueStorage = {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      if (utf8ByteLength(value) > maxBytes) {
        throw new Error(`Value exceeds SecureStore limit of ${maxBytes} bytes`);
      }
      store.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      store.delete(key);
    },
  };
  return { store, storage };
}

test('deviceStorage adapters store, read and remove items safely without browser globals', async () => {
  await supabaseAuthStorage.setItem('sb-test-auth-token', 'token-123');
  assert.equal(await supabaseAuthStorage.getItem('sb-test-auth-token'), 'token-123');
  await supabaseAuthStorage.removeItem('sb-test-auth-token');
  assert.equal(await supabaseAuthStorage.getItem('sb-test-auth-token'), null);
});

test('chunked secure storage splits session payloads > 2048 chars explicitly and cleans up chunks', async () => {
  const { store, storage } = createStrictSecureStoreMock();
  const warnings: string[] = [];
  const chunkedStorage = createChunkedSecureStorage(storage, {
    onError: (op, err) => warnings.push(`${op}:${err instanceof Error ? err.message : String(err)}`),
  });

  const largeSessionPayload = JSON.stringify({
    access_token: 'header.' + 'a'.repeat(2400) + '.signature',
    refresh_token: 'rt_' + 'b'.repeat(400),
    expires_at: 1900000000,
    user: {
      id: 'user-luanda-1',
      phone: '+244923456789',
      user_metadata: {
        full_name: 'João Sebastião Conceição da Silva',
        notes: 'Corredor Kilamba – Mutamba '.repeat(80),
      },
    },
  });

  assert.ok(largeSessionPayload.length > 2048);

  await chunkedStorage.setItem('sb:kambago/auth-token', largeSessionPayload);
  assert.equal(warnings.length, 0);

  // Confirma que foram criados múltiplos blocos, cada um abaixo de 2048 bytes
  assert.ok(store.size > 2);
  for (const storedValue of store.values()) {
    assert.ok(utf8ByteLength(storedValue) <= SECURE_STORE_MAX_BYTES);
  }

  assert.equal(await chunkedStorage.getItem('sb:kambago/auth-token'), largeSessionPayload);

  // Sobrescrever com valor pequeno deve remover os chunks antigos
  await chunkedStorage.setItem('sb:kambago/auth-token', 'compact-session');
  assert.equal(await chunkedStorage.getItem('sb:kambago/auth-token'), 'compact-session');
  assert.equal(store.size, 1);

  // Voltar a guardar valor grande e depois remover tudo
  await chunkedStorage.setItem('sb:kambago/auth-token', largeSessionPayload);
  assert.ok(store.size > 2);
  await chunkedStorage.removeItem('sb:kambago/auth-token');
  assert.equal(await chunkedStorage.getItem('sb:kambago/auth-token'), null);
  assert.equal(store.size, 0);
});

test('chunked secure storage reports errors via onError callback without leaking payload', async () => {
  const loggedOperations: Array<{ op: string; message: string }> = [];
  const failingStore: DeviceKeyValueStorage = {
    async getItem(): Promise<string | null> {
      return null;
    },
    async setItem(): Promise<void> {
      throw new Error('Keystore locked');
    },
    async removeItem(): Promise<void> {
      return;
    },
  };

  const chunkedStorage = createChunkedSecureStorage(failingStore, {
    onError: (op, error) => {
      loggedOperations.push({
        op,
        message: error instanceof Error ? error.message : String(error),
      });
    },
  });

  const secretToken = 'super-secret-jwt-token-do-not-log';
  await chunkedStorage.setItem('sb-auth', secretToken);

  assert.equal(loggedOperations.length, 1);
  assert.equal(loggedOperations[0].op, 'set');
  assert.equal(loggedOperations[0].message, 'Keystore locked');
  assert.ok(!loggedOperations[0].message.includes(secretToken));
});

test('useAuthStore persists and hydrates dataSaverEnabled via preferencesStorage', async () => {
  await preferencesStorage.removeItem('kambago_data_saver');
  useAuthStore.setState({ dataSaverEnabled: false, preferencesHydrated: false, profile: null });

  useAuthStore.getState().setDataSaverEnabled(true);
  assert.equal(useAuthStore.getState().dataSaverEnabled, true);

  // Simular reinício de estado e hidratação assíncrona
  useAuthStore.setState({ dataSaverEnabled: false, preferencesHydrated: false });
  await useAuthStore.getState().hydratePreferences();
  assert.equal(useAuthStore.getState().preferencesHydrated, true);
  assert.equal(useAuthStore.getState().dataSaverEnabled, true);

  await preferencesStorage.removeItem('kambago_data_saver');
  useAuthStore.setState({ dataSaverEnabled: false, preferencesHydrated: false });
});
