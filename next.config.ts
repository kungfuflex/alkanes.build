import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import fs from "fs";
import webpack from "webpack";

// Determine the WASM path - prefer node_modules, fall back to local ts-sdk
const nodeModulesWasmPath = path.join(process.cwd(), "node_modules/@alkanes/ts-sdk/wasm/index.js");
const localTsSdkWasmPath = path.join(process.cwd(), "ts-sdk/build/wasm/alkanes_web_sys.js");

// Use node_modules if available, otherwise local ts-sdk
const wasmPath = fs.existsSync(nodeModulesWasmPath) ? nodeModulesWasmPath :
                 fs.existsSync(localTsSdkWasmPath) ? localTsSdkWasmPath : null;

// Create next-intl plugin
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // External packages that should not be bundled on the server
  // Note: fix-standalone.js creates the missing symlinks for pnpm packages
  serverExternalPackages: ["@alkanes/ts-sdk"],

  // Enable MDX pages
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // Turbopack configuration (for dev mode)
  turbopack: wasmPath
    ? {
        resolveAlias: {
          "@alkanes/ts-sdk/wasm": wasmPath,
        },
      }
    : {},

  // Webpack configuration (for production)
  webpack: (config, { isServer }) => {
    // WASM alias - always set up if path is available
    if (wasmPath) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@alkanes/ts-sdk/wasm": wasmPath,
      };
    }

    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // WASM loader
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Help webpack resolve dynamic imports for the SDK wasm module
    // This creates a context for dynamic imports from the SDK
    if (!isServer && wasmPath) {
      config.plugins.push(
        new webpack.ContextReplacementPlugin(
          /@alkanes\/ts-sdk/,
          path.dirname(wasmPath),
          { "./wasm": "./index.js" }
        )
      );
    }

    // Fix for node: protocol imports in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };

      // Polyfill Buffer and process for browser
      // Required by libraries like randombytes, ecpair, bitcoinjs-lib
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );

      // Define global as globalThis (built-in, not a module)
      config.plugins.push(
        new webpack.DefinePlugin({
          global: "globalThis",
        })
      );
    }

    return config;
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || "mainnet",
  },

  // Ignore TypeScript errors for optional dependencies
  typescript: {
    ignoreBuildErrors: false,
  },
};

// MDX configuration
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeHighlight],
  },
});

// Combine plugins: withNextIntl wraps withMDX wraps nextConfig
export default withNextIntl(withMDX(nextConfig));
