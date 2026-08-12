/**
 * Real BIP-322 signing, for tests.
 *
 * The point of this helper is that the positive controls in the auth tests are
 * genuine: a real secp256k1 key produces a real signature over the real
 * canonical message, and `lib/bip322.ts` verifies it with real crypto. Nothing
 * here is mocked, so a test that passes proves the legitimate path works — and
 * a negative test that fails to verify fails for cryptographic reasons rather
 * than because a stub was told to say no.
 *
 * Mirrors the BIP-322 "simple" construction the verifier implements: a
 * `to_spend` transaction committing to the tagged message hash, and a
 * `to_sign` transaction spending it, serialised with its witness.
 */

import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { createHash } from "crypto";

bitcoin.initEccLib(ecc);

const BIP322_TAG = "BIP0322-signed-message";

function sha256(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

function taggedHash(tag: string, data: Buffer): Buffer {
  const tagHash = sha256(Buffer.from(tag));
  return sha256(Buffer.concat([tagHash, tagHash, data]));
}

function toSpendTx(message: string, scriptPubKey: Buffer): bitcoin.Transaction {
  const tx = new bitcoin.Transaction();
  tx.addInput(Buffer.alloc(32), 0xffffffff);
  tx.ins[0].sequence = 0;
  tx.ins[0].script = bitcoin.script.compile([
    bitcoin.opcodes.OP_0,
    taggedHash(BIP322_TAG, Buffer.from(message, "utf8")),
  ]);
  tx.addOutput(scriptPubKey, BigInt(0));
  return tx;
}

function toSignTx(spend: bitcoin.Transaction): bitcoin.Transaction {
  const tx = new bitcoin.Transaction();
  tx.version = 0;
  tx.addInput(Buffer.from(spend.getHash()), 0);
  tx.ins[0].sequence = 0;
  tx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN]), BigInt(0));
  return tx;
}

export interface TestWallet {
  address: string;
  /** Hex-encoded public key, as a browser wallet would report it. */
  publicKey: string;
  sign(message: string): string;
}

const NETWORKS = {
  mainnet: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet,
} as const;

/** A native-SegWit (bc1q…) wallet backed by a real private key. */
export function p2wpkhWallet(
  privateKeyHex: string,
  network: keyof typeof NETWORKS = "mainnet"
): TestWallet {
  const net = NETWORKS[network];
  const privateKey = Buffer.from(privateKeyHex, "hex");
  const pubkey = Buffer.from(ecc.pointFromScalar(privateKey, true)!);
  const payment = bitcoin.payments.p2wpkh({ pubkey, network: net });
  const scriptPubKey = Buffer.from(payment.output!);

  return {
    address: payment.address!,
    publicKey: pubkey.toString("hex"),
    sign(message: string) {
      const signTx = toSignTx(toSpendTx(message, scriptPubKey));
      const scriptCode = bitcoin.script.compile([
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,
        bitcoin.crypto.hash160(pubkey),
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG,
      ]);
      const hash = Buffer.from(
        signTx.hashForWitnessV0(
          0,
          scriptCode,
          BigInt(0),
          bitcoin.Transaction.SIGHASH_ALL
        )
      );
      const signature = Buffer.from(ecc.sign(hash, privateKey));
      signTx.ins[0].witness = [
        Buffer.concat([
          signature,
          Buffer.from([bitcoin.Transaction.SIGHASH_ALL]),
        ]),
        pubkey,
      ];
      return Buffer.from(signTx.toBuffer()).toString("base64");
    },
  };
}

/** A Taproot (bc1p…) key-path wallet backed by a real private key. */
export function p2trWallet(
  privateKeyHex: string,
  network: keyof typeof NETWORKS = "mainnet"
): TestWallet {
  let privateKey = Buffer.from(privateKeyHex, "hex");
  let internal = Buffer.from(ecc.pointFromScalar(privateKey, true)!);
  if (internal[0] === 0x03) {
    privateKey = Buffer.from(ecc.privateNegate(privateKey));
    internal = Buffer.from(ecc.pointFromScalar(privateKey, true)!);
  }

  const xOnly = Buffer.from(internal.subarray(1, 33));
  const tweak = taggedHash("TapTweak", xOnly);
  const tweaked = ecc.xOnlyPointAddTweak(xOnly, tweak)!;
  const outputKey = Buffer.from(tweaked.xOnlyPubkey);
  const tweakedPrivateKey = Buffer.from(ecc.privateAdd(privateKey, tweak)!);

  const scriptPubKey = Buffer.concat([Buffer.from([0x51, 0x20]), outputKey]);
  const address = bitcoin.address.toBech32(
    outputKey,
    1,
    network === "mainnet" ? "bc" : "tb"
  );

  return {
    address,
    publicKey: xOnly.toString("hex"),
    sign(message: string) {
      const signTx = toSignTx(toSpendTx(message, scriptPubKey));
      const hash = Buffer.from(
        signTx.hashForWitnessV1(
          0,
          [scriptPubKey],
          [BigInt(0)],
          bitcoin.Transaction.SIGHASH_DEFAULT
        )
      );
      signTx.ins[0].witness = [
        Buffer.from(ecc.signSchnorr(hash, tweakedPrivateKey)),
      ];
      return Buffer.from(signTx.toBuffer()).toString("base64");
    },
  };
}

/**
 * An attacker's key, unrelated to any address. `sign` produces a signature
 * over `sha256(message)` — the shape the legacy fallback path in
 * `verifyMessageSignature` accepts when it is handed a public key.
 */
export function unboundKeypair(privateKeyHex: string) {
  const privateKey = Buffer.from(privateKeyHex, "hex");
  const publicKey = Buffer.from(ecc.pointFromScalar(privateKey, true)!);
  return {
    publicKey: publicKey.toString("hex"),
    signRawSha256(message: string): string {
      const hash = sha256(Buffer.from(message, "utf8"));
      return Buffer.from(ecc.sign(hash, privateKey)).toString("base64");
    },
  };
}

/** A nonce of the shape `lib/signing-message.ts` requires. */
export function testNonce(seed = "a"): string {
  return seed.repeat(32).slice(0, 32);
}
