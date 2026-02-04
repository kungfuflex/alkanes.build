/**
 * Chained DIESEL Mint Transactions
 *
 * Creates a chain of parent-child transactions for minting DIESEL tokens.
 * Each transaction uses the unconfirmed change output of the previous one.
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import type { AlkanesClient } from '@alkanes/ts-sdk';

bitcoin.initEccLib(ecc);

/**
 * Known working OP_RETURN script for DIESEL mint (count=1)
 * From: 6a5d1214011400ff7f818cec82d08bc0a88281d215
 */
function getDieselMintOpReturn(mintCount: number): Uint8Array {
  // For now only support mintCount=1 with known working script
  // TODO: figure out encoding for other counts
  if (mintCount !== 1) {
    throw new Error("Only mintCount=1 is supported for chained mint");
  }

  const hex = "6a5d1214011400ff7f818cec82d08bc0a88281d215";
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Dust amount for outputs
const DUST_AMOUNT = 546;

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Reverse bytes (for txid little-endian conversion)
 */
function reverseBytes(bytes: Uint8Array): Uint8Array {
  const reversed = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    reversed[i] = bytes[bytes.length - 1 - i];
  }
  return reversed;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface ChainedMintParams {
  /** Number of transactions in the chain */
  chainLength: number;
  /** Mint count per transaction */
  mintCountPerTx: number;
  /** Fee rate in sat/vB */
  feeRate: number;
  /** Recipient address for minted DIESEL */
  recipientAddress: string;
  /** Change address for BTC */
  changeAddress: string;
  /** Initial UTXOs to spend */
  utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: string;
  }>;
  /** Network (mainnet or testnet) */
  network: 'mainnet' | 'testnet' | 'regtest';
}

export interface ChainedMintResult {
  /** Unsigned PSBTs in hex format */
  unsignedPsbts: string[];
  /** Total fees for all transactions */
  totalFees: number;
  /** Estimated total size in vbytes */
  totalVbytes: number;
}

export interface SignedChainResult {
  /** Signed raw transactions in hex */
  rawTxs: string[];
  /** Transaction IDs */
  txids: string[];
}

/**
 * Get bitcoin.js network from string
 */
function getNetwork(network: 'mainnet' | 'testnet' | 'regtest'): bitcoin.Network {
  switch (network) {
    case 'mainnet':
      return bitcoin.networks.bitcoin;
    case 'testnet':
      return bitcoin.networks.testnet;
    case 'regtest':
      return bitcoin.networks.regtest;
    default:
      return bitcoin.networks.bitcoin;
  }
}

/**
 * Estimate transaction vsize
 * P2TR input: ~57.5 vbytes
 * P2TR output: ~43 vbytes
 * OP_RETURN: variable
 */
function estimateVsize(numInputs: number, numOutputs: number, opReturnSize: number): number {
  const inputVbytes = numInputs * 58;
  const outputVbytes = numOutputs * 43;
  const overhead = 10;
  return inputVbytes + outputVbytes + opReturnSize + overhead;
}

/**
 * Build a chain of mint transactions
 *
 * Returns unsigned PSBTs that need to be signed.
 * After signing, use `finalizeChainedTransactions` to extract txids and update chain.
 */
export function buildChainedMintTransactions(params: ChainedMintParams): ChainedMintResult {
  const {
    chainLength,
    mintCountPerTx,
    feeRate,
    recipientAddress,
    changeAddress,
    utxos,
    network: networkName,
  } = params;

  console.log('[chained-mint] buildChainedMintTransactions called with:', {
    chainLength,
    mintCountPerTx,
    feeRate,
    networkName,
    utxosCount: utxos.length,
    utxos: utxos.map(u => ({
      txid: u.txid,
      txidLen: u.txid?.length,
      vout: u.vout,
      value: u.value,
      scriptPubKey: u.scriptPubKey,
      scriptPubKeyLen: u.scriptPubKey?.length,
    })),
  });

  const network = getNetwork(networkName);
  const unsignedPsbts: string[] = [];
  let totalFees = 0;
  let totalVbytes = 0;

  // Build OP_RETURN script for mint using known working format
  const runestoneScript = getDieselMintOpReturn(mintCountPerTx);

  // Current UTXOs to spend (starts with provided UTXOs)
  let currentUtxos = [...utxos];

  for (let i = 0; i < chainLength; i++) {
    const psbt = new bitcoin.Psbt({ network });

    // Calculate total input value
    let totalInputValue = 0;

    // Add inputs
    for (const utxo of currentUtxos) {
      console.log('[chained-mint] Processing UTXO:', {
        txid: utxo.txid,
        txidLength: utxo.txid.length,
        scriptPubKey: utxo.scriptPubKey,
        scriptPubKeyLength: utxo.scriptPubKey.length,
      });

      // Convert txid to bytes and reverse for little-endian
      const txidBytes = reverseBytes(hexToBytes(utxo.txid));
      const scriptBytes = hexToBytes(utxo.scriptPubKey);

      console.log('[chained-mint] Converted:', {
        txidBytesLength: txidBytes.length,
        scriptBytesLength: scriptBytes.length,
      });

      psbt.addInput({
        hash: Buffer.from(txidBytes),
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(scriptBytes),
          value: BigInt(utxo.value),
        },
      });
      totalInputValue += utxo.value;
    }

    // Estimate fee (2 outputs: recipient + OP_RETURN)
    const estimatedVsize = estimateVsize(currentUtxos.length, 2, runestoneScript.length);
    const fee = Math.ceil(estimatedVsize * feeRate);

    totalFees += fee;
    totalVbytes += estimatedVsize;

    // Output 0: Recipient (receives minted DIESEL + all remaining sats)
    const outputValue = totalInputValue - fee;
    if (outputValue < DUST_AMOUNT) {
      throw new Error(
        `Insufficient funds for transaction ${i + 1}. ` +
        `Need at least ${DUST_AMOUNT + fee} sats, have ${totalInputValue}`
      );
    }

    psbt.addOutput({
      address: recipientAddress,
      value: BigInt(outputValue),
    });

    // Output 1: OP_RETURN with runestone
    psbt.addOutput({
      script: Buffer.from(runestoneScript),
      value: BigInt(0),
    });

    unsignedPsbts.push(psbt.toHex());

    // For next transaction, use output 0 of this one as input
    // We use a placeholder txid - it will be updated after signing
    // Placeholder must be valid 64-char hex (32 bytes) for PSBT parsing
    if (i < chainLength - 1) {
      const outputScript = bitcoin.address.toOutputScript(recipientAddress, network);
      const outputScriptHex = bytesToHex(outputScript);
      // Create a valid 64-char hex placeholder (index encoded in last 2 chars)
      const placeholderTxid = '0'.repeat(62) + i.toString(16).padStart(2, '0');
      currentUtxos = [{
        txid: placeholderTxid,
        vout: 0, // Output 0 is recipient
        value: outputValue,
        scriptPubKey: outputScriptHex,
      }];
    }
  }

  return {
    unsignedPsbts,
    totalFees,
    totalVbytes,
  };
}

/**
 * Sign and finalize chained transactions
 *
 * Signs each PSBT and updates the next one with the correct txid from the previous.
 * Returns signed raw transactions ready for broadcast.
 */
export async function signAndFinalizeChain(
  client: AlkanesClient,
  unsignedPsbts: string[],
  networkName: 'mainnet' | 'testnet' | 'regtest'
): Promise<SignedChainResult> {
  const network = getNetwork(networkName);
  const rawTxs: string[] = [];
  const txids: string[] = [];

  for (let i = 0; i < unsignedPsbts.length; i++) {
    let psbtHex = unsignedPsbts[i];

    // If not the first transaction, update the input with previous tx's txid
    if (i > 0) {
      const psbt = bitcoin.Psbt.fromHex(psbtHex, { network });
      const prevTxid = txids[i - 1];

      // Update input 0 with the correct txid
      // We need to rebuild the PSBT with the correct input
      const newPsbt = new bitcoin.Psbt({ network });

      // Get the original input data
      const originalInput = psbt.data.inputs[0];
      const originalWitnessUtxo = originalInput.witnessUtxo;

      if (!originalWitnessUtxo) {
        throw new Error(`Missing witnessUtxo for input in transaction ${i + 1}`);
      }

      // Add input with correct txid (convert to bytes and reverse for little-endian)
      const prevTxidBytes = reverseBytes(hexToBytes(prevTxid));
      newPsbt.addInput({
        hash: Buffer.from(prevTxidBytes),
        index: 0, // Recipient output is at index 0
        witnessUtxo: originalWitnessUtxo,
      });

      // Copy outputs
      for (const output of psbt.txOutputs) {
        if (output.script.length > 0 && output.script[0] === 0x6a) {
          // OP_RETURN output
          newPsbt.addOutput({
            script: output.script,
            value: BigInt(output.value),
          });
        } else {
          newPsbt.addOutput({
            address: bitcoin.address.fromOutputScript(output.script, network),
            value: BigInt(output.value),
          });
        }
      }

      psbtHex = newPsbt.toHex();
    }

    // Sign the PSBT
    const signed = await client.signPsbt(psbtHex, { finalize: true });

    // Extract the transaction
    const signedPsbt = bitcoin.Psbt.fromHex(signed.psbtHex, { network });
    const tx = signedPsbt.extractTransaction();
    const txid = tx.getId();
    const rawTx = tx.toHex();

    txids.push(txid);
    rawTxs.push(rawTx);
  }

  return { rawTxs, txids };
}

/**
 * Broadcast chained transactions
 *
 * Broadcasts all transactions in order.
 * Returns array of confirmed txids.
 */
/**
 * Broadcast transaction directly via RPC (bypassing Rebar Shield)
 */
async function broadcastViaDirect(rawTx: string, rpcUrl: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'btc_sendrawtransaction',
      params: [rawTx],
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(`Broadcast failed: ${result.error.message || JSON.stringify(result.error)}`);
  }

  return result.result;
}

export async function broadcastChain(
  client: AlkanesClient,
  rawTxs: string[],
  options?: { useDirectBroadcast?: boolean; rpcUrl?: string }
): Promise<string[]> {
  const broadcastedTxids: string[] = [];
  const useDirectBroadcast = options?.useDirectBroadcast ?? true;
  const rpcUrl = options?.rpcUrl || process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

  for (const rawTx of rawTxs) {
    let txid: string;
    if (useDirectBroadcast) {
      console.log('[broadcastChain] Broadcasting directly via RPC:', rpcUrl);
      txid = await broadcastViaDirect(rawTx, rpcUrl);
    } else {
      txid = await client.broadcastTransaction(rawTx);
    }
    broadcastedTxids.push(txid);
    console.log('[broadcastChain] Broadcasted:', txid);
  }

  return broadcastedTxids;
}

/**
 * Execute full chained mint flow
 *
 * Builds, signs, and broadcasts a chain of DIESEL mint transactions.
 */
export async function executeChainedMint(
  client: AlkanesClient,
  params: Omit<ChainedMintParams, 'utxos'> & {
    /** If not provided, will fetch from client */
    utxos?: ChainedMintParams['utxos'];
  }
): Promise<{
  txids: string[];
  totalFees: number;
  totalMinted: number;
}> {
  // Get UTXOs if not provided
  let utxos = params.utxos;
  if (!utxos) {
    const address = await client.getAddress();
    const fetchedUtxos = await client.getUtxos();
    utxos = fetchedUtxos.map((u: any) => ({
      txid: u.txid,
      vout: u.vout,
      value: u.value,
      scriptPubKey: u.scriptPubKey,
    }));
  }

  // Build chain
  const { unsignedPsbts, totalFees } = buildChainedMintTransactions({
    ...params,
    utxos,
  });

  // Sign and finalize
  const { rawTxs, txids } = await signAndFinalizeChain(
    client,
    unsignedPsbts,
    params.network
  );

  // Broadcast
  await broadcastChain(client, rawTxs);

  return {
    txids,
    totalFees,
    totalMinted: params.chainLength * params.mintCountPerTx,
  };
}
