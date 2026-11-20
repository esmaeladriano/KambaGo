import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { DeviceKeyValueStorage } from './deviceStorage';

function sanitizeSecureStoreKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

// Tokens de sessão e refresh token do Supabase Auth ficam cifrados via expo-secure-store
// (Android Keystore / iOS Keychain).
export const supabaseAuthStorage: DeviceKeyValueStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(sanitizeSecureStoreKey(key));
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(sanitizeSecureStoreKey(key), value);
    } catch {
      // Falha silenciosa para não bloquear sessão em memória se o keystore falhar
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(sanitizeSecureStoreKey(key));
    } catch {
      // Ignorar erro de limpeza
    }
  },
};

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
