/**
 * Cross-platform, secure-context-independent UUID v4 generator and polyfill.
 *
 * In non-secure contexts (such as accessing a local dev/LAN IP http://192.168.x.x:port from mobile browsers),
 * window.crypto.randomUUID is undefined. This utility provides:
 * 1. A reliable generateUUID() function with multi-tier fallback (crypto.randomUUID -> crypto.getRandomValues -> Math.random fallback).
 * 2. Automatic global polyfill for globalThis.crypto.randomUUID to ensure any callers or dependencies don't throw.
 */

export function generateUUID(): string {
  // 1. Native crypto.randomUUID if available and working
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // Fall through if restricted by browser security policies
    }
  }

  // 2. crypto.getRandomValues fallback (RFC 4122 v4 UUID)
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      // Set version (4) and variant (RFC4122) bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Fall through to Math.random
    }
  }

  // 3. High-entropy fallback using Math.random + performance.now (RFC 4122 compliant layout)
  let d0 = (Math.random() * 0xffffffff) >>> 0;
  let d1 = (Math.random() * 0xffffffff) >>> 0;
  let d2 = (Math.random() * 0xffffffff) >>> 0;
  let d3 = (Math.random() * 0xffffffff) >>> 0;

  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    const perf = (performance.now() * 1000) >>> 0;
    d0 = (d0 ^ perf) >>> 0;
  }

  // Format as RFC4122 v4: 8-4-4-4-12 (version 4 in 3rd block, variant 10 in 4th block)
  const hex = [
    d0.toString(16).padStart(8, '0'),
    (d1 >>> 16).toString(16).padStart(4, '0'),
    (((d1 & 0x0fff) | 0x4000)).toString(16).padStart(4, '0'),
    (((d2 >>> 16) & 0x3fff | 0x8000)).toString(16).padStart(4, '0'),
    ((d2 & 0xffff).toString(16).padStart(4, '0') + d3.toString(16).padStart(8, '0')).slice(0, 12)
  ];

  return `${hex[0]}-${hex[1]}-${hex[2]}-${hex[3]}-${hex[4]}`;
}

// Polyfill global crypto and crypto.randomUUID if not present or not a function
export function installCryptoPolyfill(): void {
  if (typeof globalThis === 'undefined') return;

  if (!globalThis.crypto) {
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: generateUUID
        },
        configurable: true,
        writable: true
      });
    } catch {
      (globalThis as any).crypto = { randomUUID: generateUUID };
    }
  } else if (typeof globalThis.crypto.randomUUID !== 'function') {
    try {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: generateUUID,
        configurable: true,
        writable: true
      });
    } catch {
      try {
        (globalThis.crypto as any).randomUUID = generateUUID;
      } catch {
        // In case crypto is read-only non-configurable
      }
    }
  }
}

// Auto-run polyfill on import
installCryptoPolyfill();
