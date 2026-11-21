import test from 'node:test';
import assert from 'node:assert/strict';
import { preferencesStorage, supabaseAuthStorage, type DeviceKeyValueStorage } from './deviceStorage';
import {
  createChunkedSecureStorage,
  SECURE_STORE_MAX_BYTES,
  utf8ByteLength,
} from './chunkedStorage';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Suite de testes para o armazenamento seguro de sessão do KambaGo (`deviceStorage`).
 *
 * Contexto arquitetural (Android Keystore / iOS Keychain via `expo-secure-store`):
 * - O `expo-secure-store` impõe um limite de 2048 bytes por entrada guardada. Uma sessão completa
 *   do Supabase Auth (JWT `access_token` + `refresh_token` + `user_metadata`) ultrapassa com
 *   frequência os 2048 caracteres, provocando falhas silenciosas ou erros nativos no arranque.
 * - Estratégia adotada: divisão em blocos indexados seguros em UTF-8 (`createChunkedSecureStorage`),
 *   com teto de 1800 bytes por bloco (`<chave>.__chunk_0`, `<chave>.__chunk_1`, ...) e manifesto
 *   `__kambago_chunks_v1__:<total>` na chave principal.
 * - Por que chunking em vez de guardar apenas o `refresh_token`: guardar só o `refresh_token`
 *   impediria `getSession()`/`onAuthStateChange` de hidratar o utilizador em arranque offline ou em
 *   redes móveis instáveis de Luanda e obrigaria a uma troca de token na rede a cada abertura.
 */
function createStrictSecureStoreMock(maxBytes = SECURE_STORE_MAX_BYTES) {
  const store = new Map<string, string>();
  const storage: DeviceKeyValueStorage = {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      // Simula a restrição estrita de 2048 bytes do Expo SecureStore nativo
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

test('chunked secure storage splits session payloads > 2048 chars into indexed chunks and cleans up', async () => {
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

  // Sem chunking, o mock do Expo SecureStore rejeitaria este payload > 2048 bytes
  await assert.rejects(
    () => storage.setItem('sb_direct_fail', largeSessionPayload),
    /exceeds SecureStore limit/
  );

  await chunkedStorage.setItem('sb:kambago/auth-token', largeSessionPayload);
  assert.equal(warnings.length, 0);

  // Confirma manifesto na chave sanitizada e blocos indexados (__chunk_0, __chunk_1, ...) <= 2048 bytes
  const manifest = store.get('sb_kambago_auth-token');
  assert.ok(manifest && manifest.startsWith('__kambago_chunks_v1__:'));
  const chunkCount = Number.parseInt(manifest.split(':')[1], 10);
  assert.ok(chunkCount >= 2);
  assert.equal(store.size, chunkCount + 1);

  for (let i = 0; i < chunkCount; i += 1) {
    assert.ok(store.has(`sb_kambago_auth-token.__chunk_${i}`));
  }
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

test('chunked secure storage respects 2048-byte limit for multi-byte UTF-8 payloads and handles shrinking or missing chunks', async () => {
  const { store, storage } = createStrictSecureStoreMock();
  const chunkedStorage = createChunkedSecureStorage(storage);

  // 1400 emojis (cada um ocupa 4 bytes em UTF-8 = 5600 bytes > 2048 bytes)
  const multibytePayload = '🚕'.repeat(1400) + 'Conceição_São_Paulo_Luanda';
  assert.ok(utf8ByteLength(multibytePayload) > SECURE_STORE_MAX_BYTES);

  await chunkedStorage.setItem('sb-utf8-session', multibytePayload);
  for (const storedValue of store.values()) {
    assert.ok(utf8ByteLength(storedValue) <= SECURE_STORE_MAX_BYTES);
  }
  assert.equal(await chunkedStorage.getItem('sb-utf8-session'), multibytePayload);

  const initialEntryCount = store.size;

  // Reduzir para outro payload ainda > 2048 bytes (menos chunks) e confirmar limpeza dos excedentes
  const mediumPayload = 'x'.repeat(2300);
  await chunkedStorage.setItem('sb-utf8-session', mediumPayload);
  assert.ok(store.size < initialEntryCount);
  assert.equal(await chunkedStorage.getItem('sb-utf8-session'), mediumPayload);

  // Integridade: se um chunk estiver em falta, não devolve JSON truncado
  store.delete('sb-utf8-session.__chunk_1');
  assert.equal(await chunkedStorage.getItem('sb-utf8-session'), null);
});

test('supabaseAuthStorage persists and restores session tokens larger than 2048 chars', async () => {
  const largeToken = JSON.stringify({
    access_token: 'jwt_' + 'k'.repeat(2400),
    refresh_token: 'rt_' + 'r'.repeat(300),
  });
  assert.ok(largeToken.length > 2048);

  await supabaseAuthStorage.setItem('sb-large-session-test', largeToken);
  assert.equal(await supabaseAuthStorage.getItem('sb-large-session-test'), largeToken);
  await supabaseAuthStorage.removeItem('sb-large-session-test');
  assert.equal(await supabaseAuthStorage.getItem('sb-large-session-test'), null);
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
