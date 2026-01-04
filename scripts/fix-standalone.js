#!/usr/bin/env node
/**
 * Post-build script to fix standalone build for pnpm
 *
 * Problems fixed:
 * 1. Next.js standalone output doesn't properly symlink pnpm packages
 * 2. @alkanes/ts-sdk/wasm package.json exports "require": "./wasm/index.cjs" but the file doesn't exist
 *
 * Solutions:
 * 1. Create the missing symlinks in the standalone node_modules
 * 2. Create the missing index.cjs file for the wasm subpath
 */

const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '../.next/standalone');
const nodeModulesDir = path.join(standaloneDir, 'node_modules');
const pnpmDir = path.join(nodeModulesDir, '.pnpm');

// Packages that need symlinks created
const packagesToFix = [
  '@alkanes/ts-sdk'
];

function findPnpmPackage(packageName) {
  if (!fs.existsSync(pnpmDir)) {
    console.log('No .pnpm directory found');
    return null;
  }

  const dirs = fs.readdirSync(pnpmDir);
  // Find directory that matches the package name pattern
  // pnpm uses format: @scope+package@version_... or package@version_...
  const escapedName = packageName.replace('/', '+');
  const matchingDir = dirs.find(d => d.startsWith(escapedName + '@'));

  if (!matchingDir) {
    console.log(`No matching pnpm directory found for ${packageName}`);
    return null;
  }

  // The actual package is nested inside: .pnpm/<hash>/node_modules/<package>
  const fullPath = path.join(pnpmDir, matchingDir, 'node_modules', packageName);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }

  return null;
}

function createSymlink(packageName) {
  const sourcePath = findPnpmPackage(packageName);
  if (!sourcePath) {
    console.log(`Could not find source for ${packageName}`);
    return false;
  }

  // Create target directory structure
  const parts = packageName.split('/');
  let targetDir = nodeModulesDir;

  if (parts.length > 1) {
    // Scoped package like @alkanes/ts-sdk
    targetDir = path.join(nodeModulesDir, parts[0]);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const targetPath = path.join(nodeModulesDir, packageName);

  // Skip if already exists
  if (fs.existsSync(targetPath)) {
    console.log(`Symlink already exists: ${packageName}`);
    return true;
  }

  // Create relative symlink
  const relativePath = path.relative(path.dirname(targetPath), sourcePath);

  try {
    fs.symlinkSync(relativePath, targetPath, 'junction');
    console.log(`Created symlink: ${packageName} -> ${relativePath}`);
    return true;
  } catch (error) {
    console.error(`Failed to create symlink for ${packageName}:`, error.message);
    return false;
  }
}

/**
 * Fix the missing index.cjs in the wasm directory
 * Next.js standalone build doesn't copy index.cjs, so we need to create it
 */
function fixWasmIndexCjs() {
  const sdkPath = findPnpmPackage('@alkanes/ts-sdk');
  if (!sdkPath) {
    console.log('Could not find @alkanes/ts-sdk to fix wasm/index.cjs');
    return false;
  }

  const wasmDir = path.join(sdkPath, 'wasm');
  const indexCjsPath = path.join(wasmDir, 'index.cjs');

  if (fs.existsSync(indexCjsPath)) {
    console.log('wasm/index.cjs already exists');
    return true;
  }

  // Create the correct CJS wrapper that matches the source package
  const cjsContent = `// CommonJS export for wasm module
const wasm_module = require('./alkanes_web_sys.js');
const wasm = require('./alkanes_web_sys_bg.wasm');

module.exports = {
  ...wasm_module,
  wasm
};
`;

  try {
    fs.writeFileSync(indexCjsPath, cjsContent);
    console.log('Created wasm/index.cjs');
    return true;
  } catch (error) {
    console.error('Failed to create wasm/index.cjs:', error.message);
    return false;
  }
}

function main() {
  console.log('Fixing standalone build for pnpm...\n');

  if (!fs.existsSync(standaloneDir)) {
    console.log('No standalone directory found. Run "next build" first.');
    process.exit(1);
  }

  let success = true;
  for (const pkg of packagesToFix) {
    if (!createSymlink(pkg)) {
      success = false;
    }
  }

  // Fix the missing wasm/index.cjs
  if (!fixWasmIndexCjs()) {
    success = false;
  }

  console.log('\nDone!');
  process.exit(success ? 0 : 1);
}

main();
