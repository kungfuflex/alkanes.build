/**
 * Cross-platform WASM loader for alkanes-web-sys (CommonJS version)
 *
 * This module provides automatic environment detection and loads the WASM
 * module appropriately for Node.js CommonJS environments.
 */

const path = require('path');
const fs = require('fs');

let wasmModule = null;
let initPromise = null;

/**
 * Initialize the WASM module for Node.js CommonJS
 */
async function initNode() {
  // Read the WASM file
  const wasmPath = path.join(__dirname, 'alkanes_web_sys_bg.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);

  // Import the JS bindings (they use ES module syntax internally)
  // We need to use dynamic import for ES modules from CommonJS
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
 * Initialize and return the WASM module
 * This is idempotent - subsequent calls return the cached module
 */
async function init() {
  if (wasmModule) return wasmModule;

  if (!initPromise) {
    initPromise = (async () => {
      wasmModule = await initNode();
      return wasmModule;
    })();
  }

  return initPromise;
}

module.exports = { init, default: init };

// Re-export init as the main export
module.exports.init = init;
