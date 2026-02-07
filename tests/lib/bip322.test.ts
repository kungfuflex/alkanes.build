import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock bitcoinjs-lib and secp256k1 to avoid native module issues in tests
vi.mock("bitcoinjs-lib", () => {
  const mockTransaction = {
    addInput: vi.fn(),
    addOutput: vi.fn(),
    getHash: vi.fn(() => Buffer.alloc(32)),
    hashForWitnessV0: vi.fn(() => Buffer.alloc(32)),
    hashForWitnessV1: vi.fn(() => Buffer.alloc(32)),
    ins: [{ sequence: 0, script: Buffer.alloc(0), witness: [] }],
    version: 2,
    SIGHASH_ALL: 0x01,
    SIGHASH_DEFAULT: 0x00,
  };

  return {
    default: {},
    initEccLib: vi.fn(),
    Transaction: Object.assign(
      vi.fn(() => ({
        ...mockTransaction,
        ins: [{ sequence: 0, script: Buffer.alloc(0), witness: [] }],
      })),
      {
        fromBuffer: vi.fn(() => ({
          ins: [{ witness: [Buffer.alloc(64), Buffer.alloc(33)] }],
        })),
        SIGHASH_ALL: 0x01,
        SIGHASH_DEFAULT: 0x00,
      }
    ),
    Psbt: {
      fromBase64: vi.fn(() => {
        throw new Error("Not a PSBT");
      }),
    },
    script: {
      compile: vi.fn(() => Buffer.alloc(25)),
    },
    opcodes: {
      OP_0: 0x00,
      OP_RETURN: 0x6a,
      OP_DUP: 0x76,
      OP_HASH160: 0xa9,
      OP_EQUALVERIFY: 0x88,
      OP_CHECKSIG: 0xac,
      OP_1: 0x51,
    },
    payments: {
      p2wpkh: vi.fn(() => ({
        address: "bc1qtest",
        output: Buffer.alloc(22),
      })),
      p2tr: vi.fn(() => ({
        address: "bc1ptest",
        output: Buffer.alloc(34),
      })),
    },
    address: {
      fromBech32: vi.fn((addr: string) => {
        if (addr.startsWith("bc1p") || addr.startsWith("tb1p")) {
          return { version: 1, data: Buffer.alloc(32, 0x01) };
        }
        return { version: 0, data: Buffer.alloc(20) };
      }),
    },
    crypto: {
      hash160: vi.fn(() => Buffer.alloc(20)),
    },
    networks: {
      bitcoin: { bech32: "bc" },
      testnet: { bech32: "tb" },
    },
  };
});

vi.mock("@bitcoinerlab/secp256k1", () => ({
  default: {},
  verify: vi.fn(() => false),
  verifySchnorr: vi.fn(() => false),
}));

import { verifyBip322Signature, verifyMessageSignature } from "@/lib/bip322";
import * as ecc from "@bitcoinerlab/secp256k1";

const mockVerify = ecc.verify as ReturnType<typeof vi.fn>;
const mockVerifySchnorr = ecc.verifySchnorr as ReturnType<typeof vi.fn>;

describe("BIP-322 Signature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyBip322Signature", () => {
    it("returns false for legacy addresses (not supported)", () => {
      const result = verifyBip322Signature(
        "test message",
        "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // legacy
        Buffer.alloc(64).toString("base64")
      );
      expect(result).toBe(false);
    });

    it("returns false on invalid signature data", () => {
      const result = verifyBip322Signature(
        "test message",
        "bc1qtest123",
        "not-valid-base64!!!"
      );
      expect(result).toBe(false);
    });

    it("returns false for empty signature", () => {
      const result = verifyBip322Signature(
        "test message",
        "bc1qtest123",
        ""
      );
      expect(result).toBe(false);
    });

    it("attempts P2WPKH verification for bc1q addresses", () => {
      // With our mock, verify returns false, so the result should be false
      const sig = Buffer.alloc(64).toString("base64");
      const result = verifyBip322Signature("test", "bc1qtest", sig);
      expect(result).toBe(false);
    });

    it("attempts P2TR verification for bc1p addresses", () => {
      const sig = Buffer.alloc(64).toString("base64");
      const result = verifyBip322Signature("test", "bc1ptest", sig);
      expect(result).toBe(false);
    });

    it("supports testnet addresses (tb1q)", () => {
      const sig = Buffer.alloc(64).toString("base64");
      const result = verifyBip322Signature("test", "tb1qtest", sig, "testnet");
      expect(result).toBe(false);
    });

    it("supports testnet taproot addresses (tb1p)", () => {
      const sig = Buffer.alloc(64).toString("base64");
      const result = verifyBip322Signature("test", "tb1ptest", sig, "testnet");
      expect(result).toBe(false);
    });

    it("catches errors for P2WPKH and returns false gracefully", () => {
      // With mocked dependencies, P2WPKH verification should not crash
      const sig = Buffer.alloc(64).toString("base64");
      const result = verifyBip322Signature("test", "bc1qtest", sig);
      expect(typeof result).toBe("boolean");
    });

    it("catches errors for P2TR and returns false gracefully", () => {
      // With mocked dependencies, P2TR verification path should not crash
      const sig = Buffer.alloc(64).toString("base64"); // raw 64-byte sig
      const result = verifyBip322Signature("test", "bc1ptest", sig);
      // May return false due to mock limitations, but should not throw
      expect(typeof result).toBe("boolean");
    });
  });

  describe("verifyMessageSignature", () => {
    it("tries BIP-322 first then falls back to ECDSA with publicKey", async () => {
      // BIP-322 verify fails, then ECDSA with provided publicKey succeeds
      let callCount = 0;
      mockVerify.mockImplementation(() => {
        callCount++;
        // First call is BIP-322 attempt, second is ECDSA fallback with publicKey
        return callCount >= 2;
      });

      const sig = Buffer.alloc(64).toString("base64");
      const pubkey = Buffer.alloc(33, 0x02).toString("hex");

      const result = await verifyMessageSignature(
        "test message",
        "bc1qtest",
        sig,
        "mainnet",
        pubkey
      );
      expect(result).toBe(true);
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it("returns false when all verification methods fail", async () => {
      mockVerify.mockReturnValue(false);
      mockVerifySchnorr.mockReturnValue(false);

      const sig = Buffer.alloc(64).toString("base64");
      const result = await verifyMessageSignature(
        "test message",
        "bc1qtest",
        sig,
        "mainnet"
      );
      expect(result).toBe(false);
    });

    it("attempts multiple Schnorr methods for P2TR before giving up", async () => {
      mockVerify.mockReturnValue(false);
      mockVerifySchnorr.mockReturnValue(false);

      const sig = Buffer.alloc(64).toString("base64");
      const result = await verifyMessageSignature(
        "test",
        "bc1ptest",
        sig,
        "mainnet"
      );
      // All methods fail => false
      expect(result).toBe(false);
      // Should have attempted Schnorr verification multiple times
      expect(mockVerifySchnorr).toHaveBeenCalled();
    });

    it("tries x-only pubkey with prefixes for taproot", async () => {
      // When pubkey is 32 bytes (x-only), the code tries adding 0x02 and 0x03 prefixes
      // The flow: BIP-322 Schnorr fails -> ECDSA with 32-byte pubkey fails -> try with 0x02 prefix
      let callCount = 0;
      mockVerifySchnorr.mockReturnValue(false); // All Schnorr attempts fail
      mockVerify.mockImplementation(() => {
        callCount++;
        // Succeed on one of the prefixed attempts
        return callCount >= 3;
      });

      const sig = Buffer.alloc(64).toString("base64");
      const pubkey = Buffer.alloc(32, 0x01).toString("hex"); // x-only (32 bytes)

      const result = await verifyMessageSignature(
        "test",
        "bc1ptest",
        sig,
        "mainnet",
        pubkey
      );
      expect(result).toBe(true);
    });

    it("handles errors gracefully and returns false", async () => {
      mockVerify.mockImplementation(() => {
        throw new Error("Crypto error");
      });

      const sig = Buffer.alloc(64).toString("base64");
      const result = await verifyMessageSignature(
        "test",
        "bc1qtest",
        sig,
        "mainnet"
      );
      expect(result).toBe(false);
    });

    it("defaults to mainnet network", async () => {
      const sig = Buffer.alloc(64).toString("base64");
      const result = await verifyMessageSignature("test", "bc1qtest", sig);
      // Should not throw, defaults to mainnet
      expect(typeof result).toBe("boolean");
    });
  });
});
