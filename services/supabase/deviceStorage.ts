export interface DeviceKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const memoryFallback = new Map<string, string>();

function createWebOrMemoryStorage(): DeviceKeyValueStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // Ignorar falhas de armazenamento no navegador
      }
      return memoryFallback.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        // Ignorar falhas de armazenamento no navegador
      }
      memoryFallback.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch {
        // Ignorar falhas de armazenamento no navegador
      }
      memoryFallback.delete(key);
    },
  };
}

// Em ambiente Web (web-preview) e testes Node usa localStorage/memória;
// no build nativo Android/iOS o Metro resolve automaticamente deviceStorage.native.ts.
export const supabaseAuthStorage: DeviceKeyValueStorage = createWebOrMemoryStorage();
export const preferencesStorage: DeviceKeyValueStorage = createWebOrMemoryStorage();
