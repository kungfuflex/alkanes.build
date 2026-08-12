/**
 * Real-crypto tests for `lib/bip322.ts`.
 *
 * Deliberately does NOT mock bitcoinjs-lib or secp256k1 — the sibling suite
 * `tests/lib/bip322.test.ts` covers the control flow with stubs, and stubs
 * cannot prove that a signature verifies or that a forgery does not.
 *
 * The case that matters most: `verifyMessageSignature` takes an optional
 * public key, and routes were forwarding one straight out of the request body.
 * Nothing bound that key to the claimed address, so an attacker could sign
 * with their own key, submit their own public key alongside somebody else's
 * address, and be verified as that person.
 */

import { describe, it, expect } from "vitest";
import {
  verifyBip322Signature,
  verifyMessageSignature,
} from "@/lib/bip322";
import {
  p2trWallet,
  p2wpkhWallet,
  unboundKeypair,
} from "../helpers/bip322-signer";

const MESSAGE = "alkanes.build\nv1\naction: profile:verify";

const segwit = p2wpkhWallet("11".repeat(32));
const taproot = p2trWallet("22".repeat(32));
const otherSegwit = p2wpkhWallet("33".repeat(32));
const otherTaproot = p2trWallet("44".repeat(32));

describe("BIP-322 verification with real keys", () => {
  describe("positive controls", () => {
    it("verifies a genuine P2WPKH signature", () => {
      expect(
        verifyBip322Signature(MESSAGE, segwit.address, segwit.sign(MESSAGE))
      ).toBe(true);
    });

    it("verifies a genuine P2TR signature", () => {
      expect(
        verifyBip322Signature(MESSAGE, taproot.address, taproot.sign(MESSAGE))
      ).toBe(true);
    });

    it("verifies through verifyMessageSignature with no public key supplied", async () => {
      await expect(
        verifyMessageSignature(MESSAGE, taproot.address, taproot.sign(MESSAGE))
      ).resolves.toBe(true);
      await expect(
        verifyMessageSignature(MESSAGE, segwit.address, segwit.sign(MESSAGE))
      ).resolves.toBe(true);
    });

    it("still verifies when the wallet supplies its own (correct) public key", async () => {
      await expect(
        verifyMessageSignature(
          MESSAGE,
          segwit.address,
          segwit.sign(MESSAGE),
          "mainnet",
          segwit.publicKey
        )
      ).resolves.toBe(true);
      await expect(
        verifyMessageSignature(
          MESSAGE,
          taproot.address,
          taproot.sign(MESSAGE),
          "mainnet",
          taproot.publicKey
        )
      ).resolves.toBe(true);
    });
  });

  describe("negative controls", () => {
    it("rejects a signature over a different message", () => {
      expect(
        verifyBip322Signature(
          MESSAGE,
          taproot.address,
          taproot.sign(`${MESSAGE} tampered`)
        )
      ).toBe(false);
    });

    it("rejects a valid signature presented for somebody else's address", () => {
      expect(
        verifyBip322Signature(
          MESSAGE,
          otherTaproot.address,
          taproot.sign(MESSAGE)
        )
      ).toBe(false);
      expect(
        verifyBip322Signature(
          MESSAGE,
          otherSegwit.address,
          segwit.sign(MESSAGE)
        )
      ).toBe(false);
    });

    it("rejects garbage", () => {
      expect(
        verifyBip322Signature(MESSAGE, taproot.address, "not-base64-at-all")
      ).toBe(false);
      expect(
        verifyBip322Signature(
          MESSAGE,
          taproot.address,
          Buffer.alloc(64, "a").toString("base64")
        )
      ).toBe(false);
    });
  });

  describe("public-key binding (the impersonation bypass)", () => {
    it("rejects an attacker's key/signature pair submitted under a victim's SegWit address", async () => {
      const attacker = unboundKeypair("55".repeat(32));

      await expect(
        verifyMessageSignature(
          MESSAGE,
          segwit.address, // the victim
          attacker.signRawSha256(MESSAGE), // signed with the attacker's key
          "mainnet",
          attacker.publicKey // and the attacker's own public key
        )
      ).resolves.toBe(false);
    });

    it("rejects an attacker's key/signature pair submitted under a victim's Taproot address", async () => {
      const attacker = unboundKeypair("66".repeat(32));

      await expect(
        verifyMessageSignature(
          MESSAGE,
          taproot.address,
          attacker.signRawSha256(MESSAGE),
          "mainnet",
          attacker.publicKey
        )
      ).resolves.toBe(false);
    });

    it("rejects a real wallet's key when paired with another wallet's address", async () => {
      await expect(
        verifyMessageSignature(
          MESSAGE,
          otherSegwit.address,
          segwit.sign(MESSAGE),
          "mainnet",
          segwit.publicKey
        )
      ).resolves.toBe(false);
    });

    it("ignores a malformed public key rather than trusting it", async () => {
      await expect(
        verifyMessageSignature(
          MESSAGE,
          segwit.address,
          segwit.sign(MESSAGE),
          "mainnet",
          "zz-not-hex"
        )
      ).resolves.toBe(true); // the genuine BIP-322 path still verifies
    });
  });
});
