import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RPC_URL = process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

async function jsonRpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result as T;
}

function encodeBlockHeight(height: number): string {
  const buffer = Buffer.alloc(6);
  buffer[0] = 0x08;
  let value = height;
  let offset = 1;
  while (value > 127) {
    buffer[offset++] = (value & 0x7f) | 0x80;
    value >>>= 7;
  }
  buffer[offset++] = value;
  return '0x' + buffer.slice(0, offset).toString('hex');
}

/**
 * Parse protobuf to count transactions
 * Each top-level message in AlkanesBlockTraceEvent starts with field 1 (0x0a)
 */
function countTransactionsInProtobuf(hex: string): number {
  if (!hex || hex === '0x') return 0;

  const data = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = Buffer.from(data, 'hex');

  let count = 0;
  let pos = 0;

  while (pos < bytes.length) {
    const tag = bytes[pos];

    // Field 1, wire type 2 (length-delimited) = 0x0a
    if (tag === 0x0a) {
      count++;
      pos++;

      // Read varint length
      let length = 0;
      let shift = 0;
      while (pos < bytes.length) {
        const byte = bytes[pos++];
        length |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
      }

      // Skip the message content
      pos += length;
    } else {
      // Unknown tag, skip
      break;
    }
  }

  return count;
}

/**
 * GET /api/block-traces
 * Query params:
 *   - height: block height (optional, defaults to latest)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const heightParam = searchParams.get('height');

    let height: number;
    if (heightParam) {
      height = parseInt(heightParam, 10);
    } else {
      const heightResult = await jsonRpcCall<string>('metashrew_height', []);
      height = parseInt(heightResult, 10);
    }

    const payload = encodeBlockHeight(height);
    const result = await jsonRpcCall<string>('metashrew_view', ['traceblock', payload, 'latest']);

    const txCount = countTransactionsInProtobuf(result);

    return NextResponse.json({
      success: true,
      data: {
        height,
        txCount,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Block traces API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
