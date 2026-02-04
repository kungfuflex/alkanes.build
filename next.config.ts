import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import webpack from "webpack";

// Local WASM path (copied from SDK to avoid dynamic import issues)
const localWasmPath = "./lib/oyl/alkanes/alkanes_web_sys.js";

// Create next-intl plugin
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Note: @alkanes/ts-sdk is NOT in serverExternalPackages
  // because we need webpack to resolve the alias for @alkanes/ts-sdk/wasm

  // Enable MDX pages
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // Turbopack configuration (for dev mode)
  turbopack: {
    resolveAlias: {
      // Use local WASM with fixes
      "@alkanes/ts-sdk/wasm": localWasmPath,
      // Prevent Node.js-specific loader from being bundled for browser
      "@alkanes/ts-sdk/wasm/node-loader.cjs": { browser: "./lib/empty-module.js" },
      // Stub out Node.js built-in modules for browser builds
      fs: { browser: "./lib/empty-module.js" },
      path: { browser: "./lib/empty-module.js" },
      net: { browser: "./lib/empty-module.js" },
      tls: { browser: "./lib/empty-module.js" },
      crypto: { browser: "./lib/empty-module.js" },
      stream: { browser: "./lib/empty-module.js" },
      util: { browser: "./lib/empty-module.js" },
    },
  },

  // Webpack configuration (for dev and production)
  webpack: (config, { isServer }) => {
    // WASM alias - use local copy to avoid dynamic import issues
    // Also alias the full node_modules path for dynamic imports inside SDK
    const sdkWasmPath = path.join(__dirname, "node_modules/@alkanes/ts-sdk/wasm");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@alkanes/ts-sdk/wasm": path.join(__dirname, localWasmPath),
      // This catches dynamic imports that resolve to the full path
      [sdkWasmPath]: path.join(__dirname, localWasmPath),
    };

    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.output.webassemblyModuleFilename =
      (isServer ? '../' : '') + 'static/wasm/[modulehash].wasm';

    // WASM loader
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Server-side: Ensure all @alkanes/ts-sdk subpath imports are external
    // This prevents webpack from trying to bundle dynamic imports like @alkanes/ts-sdk/wasm
    if (isServer) {
      // Add explicit externals for SDK subpaths that use dynamic imports
      const originalExternals = config.externals || [];
      config.externals = [
        ...originalExternals,
        // Match all @alkanes/ts-sdk subpath imports
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request && request.startsWith('@alkanes/ts-sdk')) {
            // Externalize all @alkanes/ts-sdk imports
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    // Prevent Node.js-specific loader from being bundled for browser
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@alkanes/ts-sdk/wasm/node-loader.cjs": path.join(__dirname, "lib/empty-module.js"),
      };

      // Replace dynamic imports of @alkanes/ts-sdk/wasm with local copy
      // This catches the dynamic import() inside the SDK
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@alkanes\/ts-sdk\/wasm$/,
          path.join(__dirname, localWasmPath)
        )
      );

      // ContextReplacementPlugin to handle dynamic imports in SDK
      // This maps the dynamic import('@alkanes/ts-sdk/wasm') to our local copy
      config.plugins.push(
        new webpack.ContextReplacementPlugin(
          /@alkanes\/ts-sdk/,
          path.join(__dirname, "lib/oyl/alkanes"),
          {
            "@alkanes/ts-sdk/wasm": "./alkanes_web_sys.js",
          }
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
