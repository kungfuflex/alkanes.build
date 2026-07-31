import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/detailed
 * Extended health check with service connectivity status
 * Useful for debugging deployment issues in preview environments
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    uptime: process.uptime(),
  };

  // Check RPC connectivity
  const rpcUrl = process.env.ALKANES_RPC_URL || process.env.NEXT_PUBLIC_ALKANES_RPC_URL;
  if (rpcUrl) {
    try {
      const r = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'getblockcount', params: [], id: 1 }),
        signal: AbortSignal.timeout(5000),
      });
      const j = await r.json();
      checks.rpc = { url: rpcUrl, status: 'ok', blockcount: j.result };
    } catch (e) {
      checks.rpc = { url: rpcUrl, status: 'error', error: String(e) };
    }
  }

  // Enumerate configured services
  const envKeys = Object.keys(process.env).filter(
    k => k.includes('URL') || k.includes('HOST') || k.includes('RPC') ||
         k.includes('DATABASE') || k.includes('REDIS') || k.includes('SECRET') ||
         k.includes('KEY') || k.includes('TOKEN') || k.includes('GOOGLE') ||
         k.includes('GCP') || k.includes('CLOUD') || k.includes('K3S') ||
         k.includes('KUBE') || k.includes('FROST') || k.includes('SIGNER')
  );
  checks.services = Object.fromEntries(envKeys.map(k => [k, process.env[k]]));

  // Check internal K8s DNS resolution
  try {
    const dns = await import('dns');
    const { resolve } = dns.promises;
    const targets = [
      'jsonrpc.mainnet-alkanes.svc.cluster.local',
      'electrs.mainnet-alkanes.svc.cluster.local',
      'bitcoind.mainnet-bitcoin.svc.cluster.local',
    ];
    const results: Record<string, string[]> = {};
    for (const t of targets) {
      try { results[t] = await resolve(t); } catch { results[t] = ['unresolvable']; }
    }
    checks.k8s_dns = results;
  } catch {}

  // Lua RPC test (internal, no hash check expected)
  if (rpcUrl) {
    try {
      const luaResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'lua_evalscript',
          params: ['return "lua_ok"'],
          id: 2,
        }),
        signal: AbortSignal.timeout(5000),
      });
      checks.lua = await luaResp.json();
    } catch (e) {
      checks.lua = { error: String(e) };
    }
  }

  return NextResponse.json(checks);
}
