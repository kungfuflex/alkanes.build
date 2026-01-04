/**
 * WASM Pre-loader
 *
 * This module forces webpack to include the @alkanes/ts-sdk/wasm module
 * in the bundle by using a static import path that webpack can analyze.
 *
 * The SDK uses dynamic imports with variable paths which webpack cannot
 * statically analyze, causing "Cannot find module" errors at runtime.
 */

// Static import that webpack can analyze and bundle
// This ensures the wasm module is included in the client bundle
export async function preloadWasm() {
  if (typeof window === 'undefined') {
    // Server-side: skip preloading
    return null;
  }

  try {
    // Use a static string literal for webpack to analyze
    const wasm = await import('@alkanes/ts-sdk/wasm');
    return wasm;
  } catch (error) {
    console.warn('[WASM Preload] Failed to preload WASM module:', error);
    return null;
  }
}

// Export a flag to indicate preload was attempted
let preloadAttempted = false;
let preloadPromise: Promise<unknown> | null = null;

export function ensureWasmPreloaded(): Promise<unknown> {
  if (!preloadAttempted) {
    preloadAttempted = true;
    preloadPromise = preloadWasm();
  }
  return preloadPromise || Promise.resolve(null);
}
