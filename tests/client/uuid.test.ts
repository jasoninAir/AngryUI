import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateUUID, installCryptoPolyfill } from '../../src/lib/uuid';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('UUID generator and polyfill', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates valid RFC 4122 v4 UUIDs', () => {
    const id = generateUUID();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('generates unique UUIDs across multiple calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = generateUUID();
      expect(ids.has(id)).toBe(false);
      expect(id).toMatch(UUID_V4_REGEX);
      ids.add(id);
    }
  });

  it('falls back gracefully when crypto.randomUUID is not a function (insecure context/mobile)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    });

    const id = generateUUID();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('falls back gracefully when both randomUUID and getRandomValues are unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    const id = generateUUID();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('installs polyfill onto globalThis.crypto if randomUUID is missing', () => {
    const mockCrypto: any = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    };
    vi.stubGlobal('crypto', mockCrypto);

    installCryptoPolyfill();
    expect(typeof globalThis.crypto.randomUUID).toBe('function');
    const polyfilledId = globalThis.crypto.randomUUID();
    expect(polyfilledId).toMatch(UUID_V4_REGEX);
  });
});
