import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createChunkedSecureStorage } from './chunkedStorage';
import type { DeviceKeyValueStorage } from './deviceStorage';

declare const __DEV__: boolean | undefined;

function warnSecureStoreError(operation: 'get' | 'set' | 'remove', error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const reason = error instanceof Error ? error.message : 'erro desconhecido';
    console.warn(`[KambaGo SecureStore] Falha ao executar ${operation} da sessão: ${reason}`);
  }
}

const rawSecureStore: DeviceKeyValueStorage = {
  getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};

// Tokens de sessão e refresh token do Supabase Auth ficam cifrados via expo-secure-store
// (Android Keystore / iOS Keychain).
//
// Decisão arquitetural (T4): usamos chunking explícito em blocos <= 1800 bytes em vez de
// guardar apenas o refresh_token porque o Supabase Auth exige o payload completo da sessão
// (access_token, refresh_token, expires_at e user metadata) para hidratar getSession() e
// onAuthStateChange offline sem invalidar a sessão ou forçar refresh no arranque.
export const supabaseAuthStorage: DeviceKeyValueStorage = createChunkedSecureStorage(rawSecureStore, {
  onError: warnSecureStoreError,
});

// Preferências não sensíveis de interface (ex.: modo poupança de dados) usam AsyncStorage.
export const preferencesStorage: DeviceKeyValueStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignorar erro de gravação local
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignorar erro de remoção local
    }
  },
};
