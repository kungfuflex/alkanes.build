/**
 * WASM Pre-loader
 *
 * This module loads the WASM module from the local copy (lib/oyl/alkanes/)
 * using dynamic import to avoid SSG issues.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WasmModule = any;

let wasmLoaded = false;
let wasmLoadPromise: Promise<WasmModule | null> | null = null;
let cachedModule: WasmModule | null = null;

export async function preloadWasm(): Promise<WasmModule | null> {
  if (typeof window === 'undefined') {
    console.log('[WASM Preload] Server-side, skipping');
    return null;
  }

  // Dynamic import to avoid SSG build issues
  const wasmModule = await import('../lib/oyl/alkanes/alkanes_web_sys.js');

  console.log('[WASM Preload] WASM module loaded from local copy');
  wasmLoaded = true;
  cachedModule = wasmModule;
  return wasmModule;
}

export function ensureWasmPreloaded(): Promise<WasmModule | null> {
  if (!wasmLoadPromise) {
    wasmLoadPromise = preloadWasm();
  }
  return wasmLoadPromise;
}

export function getWasmModule(): WasmModule | null {
  if (wasmLoaded && cachedModule) {
    return cachedModule;
  }
  return null;
}

// Note: WebProvider is now accessed via getWasmModule().WebProvider
// after ensuring WASM is loaded
