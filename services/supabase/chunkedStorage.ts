import type { DeviceKeyValueStorage } from './deviceStorage';

export const SECURE_STORE_MAX_BYTES = 2048;
export const DEFAULT_CHUNK_MAX_BYTES = 1800;
const CHUNK_MANIFEST_PREFIX = '__kambago_chunks_v1__:';

export interface ChunkedStorageOptions {
  maxChunkBytes?: number;
  sanitizeKey?: (key: string) => string;
  onError?: (operation: 'get' | 'set' | 'remove', error: unknown) => void;
}

export function sanitizeSecureStoreKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export function splitIntoUtf8Chunks(value: string, maxChunkBytes = DEFAULT_CHUNK_MAX_BYTES): string[] {
  if (maxChunkBytes < 4) {
    throw new Error('maxChunkBytes deve ser pelo menos 4 bytes.');
  }
  if (value.length === 0) {
    return [''];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentBytes = 0;

  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    let charSlice = value[i];
    let charBytes = 1;

    if (code < 0x80) {
      charBytes = 1;
    } else if (code < 0x800) {
      charBytes = 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        charSlice = value.slice(i, i + 2);
        charBytes = 4;
        i += 1;
      } else {
        charBytes = 3;
      }
    } else {
      charBytes = 3;
    }

    if (currentBytes + charBytes > maxChunkBytes && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = charSlice;
      currentBytes = charBytes;
    } else {
      currentChunk += charSlice;
      currentBytes += charBytes;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function parseChunkCount(rawValue: string | null): number | null {
  if (!rawValue || !rawValue.startsWith(CHUNK_MANIFEST_PREFIX)) {
    return null;
  }
  const parsed = Number.parseInt(rawValue.slice(CHUNK_MANIFEST_PREFIX.length), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getChunkKey(baseKey: string, index: number): string {
  return `${baseKey}.__chunk_${index}`;
}

export function createChunkedSecureStorage(
  backingStore: DeviceKeyValueStorage,
  options: ChunkedStorageOptions = {}
): DeviceKeyValueStorage {
  const maxChunkBytes = options.maxChunkBytes ?? DEFAULT_CHUNK_MAX_BYTES;
  const sanitizeKey = options.sanitizeKey ?? sanitizeSecureStoreKey;
  const onError = options.onError;

  async function deleteChunksRange(baseKey: string, fromIndex: number, toExclusive: number): Promise<void> {
    for (let i = fromIndex; i < toExclusive; i += 1) {
      await backingStore.removeItem(getChunkKey(baseKey, i));
    }
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const safeKey = sanitizeKey(key);
      try {
        const raw = await backingStore.getItem(safeKey);
        if (raw === null) {
          return null;
        }
        const chunkCount = parseChunkCount(raw);
        if (chunkCount === null) {
          return raw;
        }
        const parts: string[] = [];
        for (let i = 0; i < chunkCount; i += 1) {
          const part = await backingStore.getItem(getChunkKey(safeKey, i));
          if (part === null) {
            return null;
          }
          parts.push(part);
        }
        return parts.join('');
      } catch (error) {
        onError?.('get', error);
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      const safeKey = sanitizeKey(key);
      try {
        const previousRaw = await backingStore.getItem(safeKey);
        const previousCount = parseChunkCount(previousRaw) ?? 0;

        if (utf8ByteLength(value) <= maxChunkBytes && !value.startsWith(CHUNK_MANIFEST_PREFIX)) {
          await backingStore.setItem(safeKey, value);
          await deleteChunksRange(safeKey, 0, previousCount);
          return;
        }

        const chunks = splitIntoUtf8Chunks(value, maxChunkBytes);
        for (let i = 0; i < chunks.length; i += 1) {
          await backingStore.setItem(getChunkKey(safeKey, i), chunks[i]);
        }
        await backingStore.setItem(safeKey, `${CHUNK_MANIFEST_PREFIX}${chunks.length}`);
        if (previousCount > chunks.length) {
          await deleteChunksRange(safeKey, chunks.length, previousCount);
        }
      } catch (error) {
        onError?.('set', error);
      }
    },

    async removeItem(key: string): Promise<void> {
      const safeKey = sanitizeKey(key);
      try {
        const previousRaw = await backingStore.getItem(safeKey);
        const previousCount = parseChunkCount(previousRaw) ?? 0;
        await backingStore.removeItem(safeKey);
        await deleteChunksRange(safeKey, 0, previousCount);
      } catch (error) {
        onError?.('remove', error);
      }
    },
  };
}
