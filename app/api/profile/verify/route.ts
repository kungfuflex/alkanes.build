import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignedAction } from "@/lib/request-auth";
import { SIGNING_ACTIONS } from "@/lib/signing-message";

/**
 * POST /api/profile/verify
 *
 * Prove control of a Bitcoin address, and mark the profile verified.
 *
 * Before: the submitted signature underwent no cryptographic operation of any
 * kind. It was length-checked, stored, and `verified: true` was written for
 * whatever address the caller named — so the verified badge was settable by
 * anyone, for anyone.
 *
 * Now: the server rebuilds the canonical `profile:verify` message from the
 * request's own fields and checks the signature against it with the
 * repository's BIP-322 verifier. `verified: true` is written only after that
 * check passes, and only for the address that actually signed.
 *
 * Request body:
 *   address   — the Bitcoin address being proved (bc1q/bc1p/tb1q/tb1p)
 *   signature — base64 BIP-322 signature over the canonical message
 *   issuedAt  — unix milliseconds, must be within the freshness window
 *   nonce     — 32 lowercase hex characters
 *
 * The message itself is NOT accepted from the client; see lib/request-auth.ts.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, issuedAt, nonce } = body ?? {};

    const auth = await verifySignedAction({
      action: SIGNING_ACTIONS.PROFILE_VERIFY,
      address,
      signature,
      issuedAt,
      nonce,
      resource: typeof address === "string" ? `address:${address}` : undefined,
    });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
      const profile = await prisma.userProfile.upsert({
        where: { address },
        create: {
          address,
          signature,
          verified: true,
          lastSeenAt: new Date(),
        },
        update: {
          signature,
          verified: true,
          lastSeenAt: new Date(),
        },
        select: {
          id: true,
          address: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          verified: true,
          postsCount: true,
          discussionsCount: true,
          likesReceived: true,
          trustLevel: true,
          createdAt: true,
          lastSeenAt: true,
        },
      });

      return NextResponse.json({ success: true, profile });
    } catch (dbError) {
      // The previous version answered 200 with `verified: true` here, which
      // told the client it was verified when nothing had been persisted.
      // A write that did not happen is not a success.
      console.error("Database error during verification:", dbError);
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error verifying profile:", error);
    return NextResponse.json(
      { error: "Failed to verify profile" },
      { status: 500 }
    );
  }
}
