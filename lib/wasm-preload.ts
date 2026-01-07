/**
 * WASM Pre-loader
 *
 * This module forces webpack to include the @alkanes/ts-sdk/wasm module
 * in the bundle by using a static import path that webpack can analyze.
 *
 * The SDK uses dynamic imports with variable paths which webpack cannot
 * statically analyze, causing "Cannot find module" errors at runtime.
 */

// Timeout for WASM loading (5 seconds)
const WASM_LOAD_TIMEOUT = 5000;

// Static import that webpack can analyze and bundle
// This ensures the wasm module is included in the client bundle
export async function preloadWasm() {
  if (typeof window === 'undefined') {
    // Server-side: skip preloading
    console.log('[WASM Preload] Server-side, skipping');
    return null;
  }

  console.log('[WASM Preload] Starting WASM preload...');

  try {
    // Race between the import and a timeout
    const result = await Promise.race([
      import('@alkanes/ts-sdk/wasm'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WASM load timeout')), WASM_LOAD_TIMEOUT)
      ),
    ]);
    console.log('[WASM Preload] WASM module loaded successfully');
    return result;
  } catch (error) {
    console.warn('[WASM Preload] Failed to preload WASM module:', error);
    return null;
  }
}

// Export a flag to indicate preload was attempted
let preloadAttempted = false;
let preloadPromise: Promise<unknown> | null = null;

export function ensureWasmPreloaded(): Promise<unknown> {
  console.log('[WASM Preload] ensureWasmPreloaded called, attempted:', preloadAttempted);
  if (!preloadAttempted) {
    preloadAttempted = true;
    preloadPromise = preloadWasm();
  }
  return preloadPromise || Promise.resolve(null);
}
