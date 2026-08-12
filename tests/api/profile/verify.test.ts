/**
 * POST /api/profile/verify
 *
 * Before this mission the submitted signature underwent no cryptographic
 * operation of any kind: it was length-checked, stored, and `verified: true`
 * was written for whatever address the caller named. The previous version of
 * this suite encoded that behaviour — it asserted that 64 bytes of the letter
 * "a" produced a verified profile. Those assertions are gone, because they
 * asserted the vulnerability.
 *
 * Real keys and real signatures throughout: the negatives fail because the
 * cryptography rejects them, and the positive controls pass because a genuine
 * BIP-322 signature genuinely verifies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: { userProfile: { upsert: vi.fn() } },
  default: { userProfile: { upsert: vi.fn() } },
}));

import { POST } from "@/app/api/profile/verify/route";
import { prisma } from "@/lib/prisma";
import { buildSigningMessage, SIGNING_ACTIONS } from "@/lib/signing-message";
import {
  p2trWallet,
  p2wpkhWallet,
  testNonce,
  unboundKeypair,
} from "../../helpers/bip322-signer";

const mockUpsert = prisma.userProfile.upsert as ReturnType<typeof vi.fn>;

const taproot = p2trWallet("e5".repeat(32));
const segwit = p2wpkhWallet("f6".repeat(32));
const victim = p2trWallet("17".repeat(32));

function verifyMessage(address: string, issuedAt: number, nonce: string) {
  return buildSigningMessage({
    action: SIGNING_ACTIONS.PROFILE_VERIFY,
    address,
    resource: `address:${address}`,
    issuedAt,
    nonce,
  });
}

function signedRequest(
  wallet: { address: string; sign(m: string): string },
  overrides: Record<string, unknown> = {}
) {
  const issuedAt = Date.now();
  const nonce = testNonce("9");
  const body = {
    address: wallet.address,
    signature: wallet.sign(verifyMessage(wallet.address, issuedAt, nonce)),
    issuedAt,
    nonce,
    ...overrides,
  };
  return new NextRequest("http://localhost/api/profile/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function rawRequest(body: unknown) {
  return new NextRequest("http://localhost/api/profile/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function profileFor(address: string) {
  return {
    id: "test-id",
    address,
    displayName: null,
    bio: null,
    avatarUrl: null,
    verified: true,
    postsCount: 0,
    discussionsCount: 0,
    likesReceived: 0,
    trustLevel: 0,
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };
}

describe("POST /api/profile/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("negative — nothing is written without a real signature", () => {
    it("rejects the exact pre-fix payload (padding bytes as a signature)", async () => {
      const issuedAt = Date.now();
      const response = await POST(
        rawRequest({
          address: victim.address,
          signature: Buffer.alloc(64, "a").toString("base64"),
          issuedAt,
          nonce: testNonce("1"),
        })
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid signature");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects a 71-byte DER-shaped blob, which the old route accepted", async () => {
      const response = await POST(
        rawRequest({
          address: victim.address,
          signature: Buffer.alloc(71, "c").toString("base64"),
          issuedAt: Date.now(),
          nonce: testNonce("2"),
        })
      );

      expect(response.status).toBe(401);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects one address's genuine signature presented for another address", async () => {
      const issuedAt = Date.now();
      const nonce = testNonce("3");
      // A real signature — just not by the address being claimed.
      const signature = taproot.sign(
        verifyMessage(victim.address, issuedAt, nonce)
      );

      const response = await POST(
        rawRequest({ address: victim.address, signature, issuedAt, nonce })
      );

      expect(response.status).toBe(401);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects an attacker's own keypair submitted under a victim's address", async () => {
      const attacker = unboundKeypair("28".repeat(32));
      const issuedAt = Date.now();
      const nonce = testNonce("4");

      const response = await POST(
        rawRequest({
          address: victim.address,
          signature: attacker.signRawSha256(
            verifyMessage(victim.address, issuedAt, nonce)
          ),
          publicKey: attacker.publicKey, // ignored: never forwarded to the verifier
          issuedAt,
          nonce,
        })
      );

      expect(response.status).toBe(401);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects a signature for a different action replayed as profile verification", async () => {
      const issuedAt = Date.now();
      const nonce = testNonce("5");
      const otherAction = buildSigningMessage({
        action: SIGNING_ACTIONS.BUILDER_REGISTER,
        address: taproot.address,
        resource: `address:${taproot.address}`,
        issuedAt,
        nonce,
      });

      const response = await POST(
        rawRequest({
          address: taproot.address,
          signature: taproot.sign(otherAction),
          issuedAt,
          nonce,
        })
      );

      expect(response.status).toBe(401);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects an expired signature", async () => {
      const issuedAt = Date.now() - 6 * 60 * 1000;
      const nonce = testNonce("6");

      const response = await POST(
        rawRequest({
          address: taproot.address,
          signature: taproot.sign(
            verifyMessage(taproot.address, issuedAt, nonce)
          ),
          issuedAt,
          nonce,
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("expired");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects a signature dated in the future", async () => {
      const issuedAt = Date.now() + 10 * 60 * 1000;
      const nonce = testNonce("7");

      const response = await POST(
        rawRequest({
          address: taproot.address,
          signature: taproot.sign(
            verifyMessage(taproot.address, issuedAt, nonce)
          ),
          issuedAt,
          nonce,
        })
      );

      expect(response.status).toBe(400);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects a missing signature, address, nonce or timestamp", async () => {
      const complete = {
        address: taproot.address,
        signature: "x",
        issuedAt: Date.now(),
        nonce: testNonce("8"),
      };
      for (const field of ["address", "signature", "issuedAt", "nonce"]) {
        const body: Record<string, unknown> = { ...complete };
        delete body[field];
        const response = await POST(rawRequest(body));
        expect(response.status).toBe(400);
      }
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects a malformed nonce", async () => {
      const response = await POST(
        rawRequest({
          address: taproot.address,
          signature: "x",
          issuedAt: Date.now(),
          nonce: "not-a-nonce",
        })
      );

      expect(response.status).toBe(400);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects an invalid Bitcoin address", async () => {
      const response = await POST(
        rawRequest({
          address: "not-an-address",
          signature: "x",
          issuedAt: Date.now(),
          nonce: testNonce("a"),
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid Bitcoin address");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("reports a failed write as a failure, not as success", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("Connection failed"));

      const response = await POST(signedRequest(taproot));
      const data = await response.json();

      // The old route answered 200 with verified:true after the write failed.
      expect(response.status).toBe(503);
      expect(data.error).toContain("Database unavailable");
    });
  });

  describe("positive controls — genuine signatures still verify", () => {
    it("verifies a real Taproot signature and marks the profile verified", async () => {
      mockUpsert.mockResolvedValueOnce(profileFor(taproot.address));

      const response = await POST(signedRequest(taproot));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile.verified).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { address: taproot.address },
          update: expect.objectContaining({ verified: true }),
          create: expect.objectContaining({ verified: true }),
        })
      );
    });

    it("verifies a real native-SegWit signature", async () => {
      mockUpsert.mockResolvedValueOnce(profileFor(segwit.address));

      const response = await POST(signedRequest(segwit));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.verified).toBe(true);
    });

    it("stores the signature it actually verified", async () => {
      mockUpsert.mockResolvedValueOnce(profileFor(taproot.address));

      const issuedAt = Date.now();
      const nonce = testNonce("b");
      const signature = taproot.sign(
        verifyMessage(taproot.address, issuedAt, nonce)
      );

      await POST(
        rawRequest({
          address: taproot.address,
          signature,
          issuedAt,
          nonce,
        })
      );

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ signature }),
          update: expect.objectContaining({ signature }),
        })
      );
    });
  });
});
