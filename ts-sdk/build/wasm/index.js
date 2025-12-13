/**
 * Cross-platform WASM loader for alkanes-web-sys
 *
 * This module provides automatic environment detection and loads the WASM
 * module appropriately for Node.js (CommonJS/ESM) or browser environments.
 */

let wasmModule = null;
let initPromise = null;

/**
 * Detect if we're running in Node.js
 */
function isNode() {
  return typeof process !== 'undefined' &&
         process.versions != null &&
         process.versions.node != null;
}

/**
 * Initialize the WASM module for Node.js
 */
async function initNode() {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const fs = await import('fs');

  // Get the directory of this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Read the WASM file
  const wasmPath = path.join(__dirname, 'alkanes_web_sys_bg.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);

  // Import the JS bindings
  const wasm = await import('./alkanes_web_sys_bg.js');

  // Compile and instantiate the WASM module
  const wasmInstance = await WebAssembly.instantiate(wasmBuffer, {
    './alkanes_web_sys_bg.js': wasm,
  });

  // Set the WASM instance
  wasm.__wbg_set_wasm(wasmInstance.instance.exports);

  // Initialize
  wasmInstance.instance.exports.__wbindgen_start();

  return wasm;
}

/**
 * Initialize the WASM module for browser
 */
async function initBrowser() {
  // In browser, we can use the standard web loader
  const wasm = await import('./alkanes_web_sys.js');
  return wasm;
}

/**
 * Initialize and return the WASM module
 * This is idempotent - subsequent calls return the cached module
 */
export async function init() {
  if (wasmModule) return wasmModule;

  if (!initPromise) {
    initPromise = (async () => {
      if (isNode()) {
        wasmModule = await initNode();
      } else {
        wasmModule = await initBrowser();
      }
      return wasmModule;
    })();
  }

  return initPromise;
}

// Re-export everything from the bindings after initialization
export * from './alkanes_web_sys_bg.js';

// Default export is the init function
export default init;
