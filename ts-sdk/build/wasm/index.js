// Re-export the wasm-pack generated module
import initWasm, * as wasmModule from "./alkanes_web_sys.js";

export * from "./alkanes_web_sys.js";

let initialized = false;
let initPromise = null;

// Provide an init function that actually initializes the WASM module
export async function init() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Check if we're in Node.js (even if DOM is emulated like in happy-dom/jsdom)
    // process.versions.node exists only in actual Node.js environment
    const isNodeJs = typeof process !== 'undefined' && process.versions && process.versions.node;

    if (isNodeJs) {
      // For Node.js (including happy-dom/vitest), read the wasm file from disk
      const fs = await import('fs');
      const path = await import('path');
      const url = await import('url');

      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const wasmPath = path.join(__dirname, 'alkanes_web_sys_bg.wasm');
      const wasmBytes = fs.readFileSync(wasmPath);
      await initWasm(wasmBytes);
    } else {
      // For browser, use the default fetch-based initialization
      await initWasm();
    }
    initialized = true;
  })();

  return initPromise;
}

// Auto-initialize for convenience (returns a promise)
export const ready = init();
