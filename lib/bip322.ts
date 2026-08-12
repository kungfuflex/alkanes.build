/**
 * BIP-322 Message Signing Verification
 * https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
 *
 * Supports verification of signatures for:
 * - P2WPKH (Native SegWit, bc1q...)
 * - P2TR (Taproot, bc1p...)
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import { createHash } from 'crypto';

// Initialize ECC library
bitcoin.initEccLib(ecc);

// SHA256 helper
function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

// BIP-322 tag for message hashing
const BIP322_TAG = 'BIP0322-signed-message';

/**
 * Create tagged hash according to BIP-340
 */
function taggedHash(tag: string, data: Buffer): Buffer {
  const tagHash = sha256(Buffer.from(tag));
  return sha256(Buffer.concat([tagHash, tagHash, data]));
}

/**
 * Create the BIP-322 message hash
 */
function createMessageHash(message: string): Buffer {
  const msgBuffer = Buffer.from(message, 'utf8');
  return taggedHash(BIP322_TAG, msgBuffer);
}

/**
 * Create the "to_spend" transaction for BIP-322
 * This is a virtual transaction that commits to the message
 */
function createToSpendTx(message: string, scriptPubKey: Buffer): bitcoin.Transaction {
  const tx = new bitcoin.Transaction();

  // Input: OP_0 OP_PUSHDATA(32) <message_hash>
  const messageHash = createMessageHash(message);
  tx.addInput(Buffer.alloc(32), 0xFFFFFFFF);
  tx.ins[0].sequence = 0;
  tx.ins[0].script = bitcoin.script.compile([
    bitcoin.opcodes.OP_0,
    messageHash,
  ]);

  // Output: scriptPubKey of the signing address
  tx.addOutput(scriptPubKey, BigInt(0));

  return tx;
}

/**
 * Decode a BIP-322 simple signature
 * Returns the witness stack
 */
function decodeSimpleSignature(signatureBase64: string): Buffer[] {
  const sigBuffer = Buffer.from(signatureBase64, 'base64');

  console.log('[BIP322] Decoding signature, length:', sigBuffer.length, 'hex:', sigBuffer.toString('hex').slice(0, 40) + '...');

  // Try to parse as a witness transaction (to_sign tx)
  try {
    const tx = bitcoin.Transaction.fromBuffer(sigBuffer);
    if (tx.ins.length > 0 && tx.ins[0].witness.length > 0) {
      console.log('[BIP322] Decoded as witness transaction, witness items:', tx.ins[0].witness.length);
      return tx.ins[0].witness.map(w => Buffer.from(w));
    }
  } catch (e) {
    console.log('[BIP322] Not a witness transaction:', (e as Error).message);
  }

  // Try to parse as PSBT
  try {
    const psbt = bitcoin.Psbt.fromBase64(signatureBase64);
    if (psbt.data.inputs[0]?.finalScriptWitness) {
      // Parse witness from PSBT
      const witnessBuffer = Buffer.from(psbt.data.inputs[0].finalScriptWitness);
      console.log('[BIP322] Decoded as PSBT with finalScriptWitness');
      return parseWitnessStack(witnessBuffer);
    }
  } catch (e) {
    console.log('[BIP322] Not a PSBT:', (e as Error).message);
  }

  // Legacy: raw signature (64 or 65 bytes for Schnorr, 70-72 for ECDSA)
  if (sigBuffer.length >= 64 && sigBuffer.length <= 73) {
    console.log('[BIP322] Using raw signature format, length:', sigBuffer.length);
    return [sigBuffer];
  }

  throw new Error('Unable to decode BIP-322 signature');
}

/**
 * Parse witness stack from serialized witness
 */
function parseWitnessStack(witnessBuffer: Buffer): Buffer[] {
  const stack: Buffer[] = [];
  let offset = 0;

  // Read varint for number of items
  const { value: itemCount, bytesRead } = readVarInt(witnessBuffer, offset);
  offset += bytesRead;

  for (let i = 0; i < itemCount; i++) {
    const { value: itemLen, bytesRead: lenBytes } = readVarInt(witnessBuffer, offset);
    offset += lenBytes;
    stack.push(witnessBuffer.slice(offset, offset + itemLen));
    offset += itemLen;
  }

  return stack;
}

function readVarInt(buffer: Buffer, offset: number): { value: number; bytesRead: number } {
  const first = buffer[offset];
  if (first < 0xfd) {
    return { value: first, bytesRead: 1 };
  } else if (first === 0xfd) {
    return { value: buffer.readUInt16LE(offset + 1), bytesRead: 3 };
  } else if (first === 0xfe) {
    return { value: buffer.readUInt32LE(offset + 1), bytesRead: 5 };
  } else {
    // For simplicity, we don't handle 8-byte varints
    throw new Error('Varint too large');
  }
}

/**
 * Verify a BIP-322 signature for a P2WPKH address
 */
function verifyP2WPKH(
  message: string,
  address: string,
  witness: Buffer[],
  network: bitcoin.Network
): boolean {
  if (witness.length !== 2) {
    return false;
  }

  const [encodedSig, pubkey] = witness;

  // Verify the pubkey matches the address
  const { address: derivedAddress } = bitcoin.payments.p2wpkh({
    pubkey,
    network
  });

  if (derivedAddress !== address) {
    return false;
  }

  // Create the to_spend transaction
  const scriptPubKey = Buffer.from(bitcoin.payments.p2wpkh({ pubkey, network }).output!);
  const toSpendTx = createToSpendTx(message, scriptPubKey);

  // Determine sighash type from signature
  const sighashType = encodedSig.length > 64 ? encodedSig[encodedSig.length - 1] : bitcoin.Transaction.SIGHASH_ALL;
  const actualSig = encodedSig.length > 64 ? encodedSig.subarray(0, -1) : encodedSig;

  // Create the "to_sign" transaction (BIP-322 format)
  const toSignTx = new bitcoin.Transaction();
  toSignTx.version = 0;
  toSignTx.addInput(Buffer.from(toSpendTx.getHash()), 0);
  toSignTx.ins[0].sequence = 0;
  toSignTx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN]), BigInt(0));

  // For P2WPKH, the script for sighash is the scriptCode (P2PKH format)
  // scriptCode = OP_DUP OP_HASH160 <pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG
  const pubkeyHash = bitcoin.crypto.hash160(pubkey);
  const scriptCode = bitcoin.script.compile([
    bitcoin.opcodes.OP_DUP,
    bitcoin.opcodes.OP_HASH160,
    pubkeyHash,
    bitcoin.opcodes.OP_EQUALVERIFY,
    bitcoin.opcodes.OP_CHECKSIG,
  ]);

  // Compute sighash for SegWit v0
  const hash = Buffer.from(toSignTx.hashForWitnessV0(
    0,
    scriptCode,
    BigInt(0),
    sighashType
  ));

  // Verify ECDSA signature
  return ecc.verify(hash, pubkey, actualSig);
}

/**
 * Verify a BIP-322 signature for a P2TR (Taproot) address
 */
function verifyP2TR(
  message: string,
  address: string,
  witness: Buffer[],
  network: bitcoin.Network
): boolean {
  if (witness.length < 1) {
    return false;
  }

  // For key-path spend, witness is just [signature]
  // For script-path, it's [signature, script, control_block]
  const encodedSig = witness[0];

  // Extract x-only pubkey (output key) from address
  // Note: This is the tweaked pubkey, not the internal pubkey
  const decoded = bitcoin.address.fromBech32(address);
  if (decoded.version !== 1 || decoded.data.length !== 32) {
    return false;
  }
  const outputKey = Buffer.from(decoded.data);

  // Build scriptPubKey directly: OP_1 <32-byte-pubkey>
  // Don't use p2tr() which expects internal pubkey
  const scriptPubKey = Buffer.concat([
    Buffer.from([0x51, 0x20]), // OP_1 PUSH32
    outputKey
  ]);

  // Create the to_spend transaction
  const toSpendTx = createToSpendTx(message, scriptPubKey);

  // Determine sighash type from signature
  // 64 bytes = SIGHASH_DEFAULT (0x00)
  // 65 bytes = last byte is sighash flag
  const hashType = encodedSig.length === 65
    ? encodedSig[64]
    : bitcoin.Transaction.SIGHASH_DEFAULT;
  const actualSig = encodedSig.length === 65
    ? encodedSig.subarray(0, 64)
    : encodedSig;

  // Create the "to_sign" transaction (BIP-322 format)
  const toSignTx = new bitcoin.Transaction();
  toSignTx.version = 0;
  toSignTx.addInput(Buffer.from(toSpendTx.getHash()), 0);
  toSignTx.ins[0].sequence = 0;
  toSignTx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN]), BigInt(0));

  // Compute sighash using bitcoinjs-lib's hashForWitnessV1
  const hash = Buffer.from(toSignTx.hashForWitnessV1(
    0,                    // input index
    [scriptPubKey],       // prevout scripts
    [BigInt(0)],          // prevout values
    hashType              // sighash type
  ));

  // Verify Schnorr signature against the output key
  return ecc.verifySchnorr(hash, outputKey, actualSig);
}

/**
 * Verify a BIP-322 message signature
 *
 * @param message - The message that was signed
 * @param address - The Bitcoin address that signed the message
 * @param signature - The BIP-322 signature (base64 encoded)
 * @param networkType - 'mainnet' or 'testnet'
 * @returns true if signature is valid
 */
export function verifyBip322Signature(
  message: string,
  address: string,
  signature: string,
  networkType: 'mainnet' | 'testnet' | 'regtest' = 'mainnet'
): boolean {
  try {
    const network = networkType === 'mainnet'
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

    // Decode the signature
    const witness = decodeSimpleSignature(signature);

    // Determine address type and verify
    if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
      // P2WPKH (Native SegWit)
      return verifyP2WPKH(message, address, witness, network);
    } else if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
      // P2TR (Taproot)
      return verifyP2TR(message, address, witness, network);
    } else {
      // Legacy addresses not supported in this implementation
      console.warn('BIP-322: Legacy address types not supported');
      return false;
    }
  } catch (error) {
    console.error('BIP-322 verification error:', error);
    return false;
  }
}

/**
 * Compute Bitcoin legacy message hash (BIP-137 / legacy signmessage)
 * Hash = SHA256(SHA256(varint(prefix.length) + prefix + varint(message.length) + message))
 */
function bitcoinMessageHash(message: string): Buffer {
  const prefix = Buffer.from('\x18Bitcoin Signed Message:\n', 'utf8');
  const msgBuf = Buffer.from(message, 'utf8');
  const msgLen = encodeVarint(msgBuf.length);
  return sha256(sha256(Buffer.concat([prefix, msgLen, msgBuf])));
}

function encodeVarint(n: number): Buffer {
  if (n < 0xfd) return Buffer.from([n]);
  if (n <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf[0] = 0xfd;
    buf.writeUInt16LE(n, 1);
    return buf;
  }
  const buf = Buffer.alloc(5);
  buf[0] = 0xfe;
  buf.writeUInt32LE(n, 1);
  return buf;
}

/**
 * Expand a hex public key into the compressed forms it could represent.
 * A 32-byte x-only key has two candidate parities.
 */
function publicKeyVariants(publicKey: string): Buffer[] {
  let pkBuf: Buffer;
  try {
    pkBuf = Buffer.from(publicKey, 'hex');
  } catch {
    return [];
  }
  if (pkBuf.length === 33) return [pkBuf];
  if (pkBuf.length === 32) {
    return [
      Buffer.concat([Buffer.from([0x02]), pkBuf]),
      Buffer.concat([Buffer.from([0x03]), pkBuf]),
    ];
  }
  return [];
}

/**
 * Does this public key actually control the claimed address?
 *
 * P2WPKH — the key must hash to the address's witness program.
 * P2TR    — the key must equal the address's output key, either directly (a
 *           wallet that reports the tweaked key) or after the BIP-341 tweak (a
 *           wallet that reports the internal key).
 *
 * Anything else is not a proof of anything and returns false.
 */
function publicKeyMatchesAddress(
  pubkey: Buffer,
  address: string,
  network: bitcoin.Network
): boolean {
  try {
    if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
      const { address: derived } = bitcoin.payments.p2wpkh({ pubkey, network });
      return derived === address;
    }

    if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
      const decoded = bitcoin.address.fromBech32(address);
      if (decoded.version !== 1 || decoded.data.length !== 32) return false;
      const outputKey = Buffer.from(decoded.data);

      const xOnly = pubkey.length === 33 ? pubkey.subarray(1) : pubkey;
      if (xOnly.length !== 32) return false;

      // Wallet reported the output (tweaked) key.
      if (Buffer.from(xOnly).equals(outputKey)) return true;

      // Wallet reported the internal key: apply the BIP-341 key-path tweak.
      const tweaked = ecc.xOnlyPointAddTweak(
        xOnly,
        taggedHash('TapTweak', Buffer.from(xOnly))
      );
      return (
        !!tweaked && Buffer.from(tweaked.xOnlyPubkey).equals(outputKey)
      );
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Verify signature with fallback for wallet-specific formats
 *
 * Supports:
 * - BIP-322 (standard Bitcoin message signing for P2WPKH/P2TR)
 * - KeystoreSigner format (SHA256 + ECDSA compact, 64 bytes)
 * - Browser wallet formats (65-byte recoverable ECDSA, legacy Bitcoin message signing)
 *
 * @param message - The message that was signed
 * @param address - The Bitcoin address that signed
 * @param signature - Base64 encoded signature
 * @param networkType - Network type
 * @param publicKey - Optional hex-encoded public key. It is used ONLY if it
 *                    derives `address`; a key that does not is ignored, so
 *                    passing an untrusted, request-supplied key is safe.
 */
export async function verifyMessageSignature(
  message: string,
  address: string,
  signature: string,
  networkType: 'mainnet' | 'testnet' | 'regtest' = 'mainnet',
  publicKey?: string
): Promise<boolean> {
  console.log('[BIP322] Verifying signature for address:', address.slice(0, 8) + '...');

  // 1. Try full BIP-322 verification first
  if (verifyBip322Signature(message, address, signature, networkType)) {
    console.log('[BIP322] Verified with full BIP-322');
    return true;
  }

  const sigBuffer = Buffer.from(signature, 'base64');
  console.log('[BIP322] Raw sig length:', sigBuffer.length, 'pubkey provided:', !!publicKey);

  // Build signature variants to try
  // Many browser wallets return 65-byte recoverable sigs: [recovery_flag(1), r(32), s(32)]
  const sigVariants: Buffer[] = [];
  if (sigBuffer.length === 64) {
    sigVariants.push(sigBuffer);
  } else if (sigBuffer.length === 65) {
    sigVariants.push(sigBuffer.slice(1)); // strip recovery flag → 64 bytes
    sigVariants.push(sigBuffer);          // also try full 65 bytes
  }

  // Build message hash variants to try
  const msgBuf = Buffer.from(message, 'utf8');
  const hashVariants = [
    { name: 'sha256', hash: sha256(msgBuf) },
    { name: 'bitcoin-message', hash: bitcoinMessageHash(message) },
    { name: 'double-sha256', hash: sha256(sha256(msgBuf)) },
  ];

  // Any caller-supplied public key must DERIVE the claimed address before it
  // is allowed to verify anything. Without that binding an attacker submits
  // their own keypair alongside somebody else's address, signs the message
  // with their own key, and the loops below happily return true — a complete
  // authentication bypass for every route that forwards a request-body public
  // key into this function.
  const network =
    networkType === 'mainnet'
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const boundPubkeys = publicKey
    ? publicKeyVariants(publicKey).filter((pk) =>
        publicKeyMatchesAddress(pk, address, network)
      )
    : [];

  if (publicKey && boundPubkeys.length === 0) {
    console.warn(
      '[BIP322] supplied public key does not derive the claimed address — ignoring it'
    );
  }

  // ECDSA needs a 33-byte compressed pubkey, and only an address-bound one.
  const ecdsaPubkeys: Buffer[] = boundPubkeys;

  // Schnorr: the address itself is the primary source of the key.
  const schnorrPubkeys: Buffer[] = [];
  if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
    try {
      const decoded = bitcoin.address.fromBech32(address);
      if (decoded.version === 1 && decoded.data.length === 32) {
        schnorrPubkeys.push(Buffer.from(decoded.data));
      }
    } catch {}
  }
  for (const pk of boundPubkeys) {
    const xOnly = pk.length === 33 ? pk.subarray(1) : pk;
    if (xOnly.length === 32 && !schnorrPubkeys.some((k) => k.equals(xOnly))) {
      schnorrPubkeys.push(Buffer.from(xOnly));
    }
  }

  // 2. Try ECDSA verification with all combinations
  for (const { name, hash } of hashVariants) {
    for (const pk of ecdsaPubkeys) {
      for (const sig of sigVariants) {
        if (sig.length !== 64) continue;
        try {
          if (ecc.verify(hash, pk, sig)) {
            console.log(`[BIP322] Verified ECDSA: ${name}, pk=${pk.length}b`);
            return true;
          }
        } catch {}
      }
    }
  }

  // 3. Try Schnorr verification with all combinations
  for (const { name, hash } of hashVariants) {
    for (const pk of schnorrPubkeys) {
      for (const sig of sigVariants) {
        if (sig.length !== 64) continue;
        try {
          if (ecc.verifySchnorr(hash, pk, sig)) {
            console.log(`[BIP322] Verified Schnorr: ${name}`);
            return true;
          }
        } catch {}
      }
    }
  }

  console.log('[BIP322] All verification methods failed');
  return false;
}
