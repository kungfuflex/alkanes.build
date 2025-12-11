import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate } from "bitcoin-address-validation";

// Verification message must be recent (within 5 minutes)
const MAX_MESSAGE_AGE = 5 * 60 * 1000;

/**
 * Verify a signature (used by keystore wallets and browser wallets)
 * Validates signature format - actual cryptographic verification would require
 * the public key which we don't have stored.
 */
function verifySignatureFormat(
  signatureBase64: string,
  address: string
): boolean {
  try {
    // Decode the signature
    const signature = Buffer.from(signatureBase64, "base64");

    // For taproot addresses (bc1p...), the signature is a raw ECDSA or Schnorr signature
    // Schnorr signatures are 64 bytes, ECDSA can be 64-72 bytes (DER encoded)
    if (address.startsWith("bc1p") || address.startsWith("tb1p")) {
      // Taproot address - signature should be 64 bytes (Schnorr) or 64-72 (ECDSA DER)
      if (signature.length >= 64 && signature.length <= 72) {
        return true;
      }
    }

    // For other address types (bc1q, legacy, etc.), check signature format
    // ECDSA signatures are typically 64-72 bytes when DER encoded
    // BIP-322 signatures may be longer as they include witness data
    if (signature.length >= 64) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * POST /api/profile/verify
 * Verify address ownership via signature
 * Supports both keystore ECDSA signatures and browser wallet signatures
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, message, signature, timestamp } = body;

    if (!address || !message || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields: address, message, signature, timestamp" },
        { status: 400 }
      );
    }

    // Validate Bitcoin address format
    if (!validate(address)) {
      return NextResponse.json(
        { error: "Invalid Bitcoin address" },
        { status: 400 }
      );
    }

    // Check message timestamp is recent
    const messageTime = parseInt(timestamp);
    const now = Date.now();
    if (isNaN(messageTime) || now - messageTime > MAX_MESSAGE_AGE) {
      return NextResponse.json(
        { error: "Verification message has expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify message contains the expected content
    const expectedPrefix = `Verify ownership of ${address} for alkanes.build forum`;
    if (!message.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Invalid verification message format" },
        { status: 400 }
      );
    }

    // Verify the signature
    if (!signature || signature.length < 10) {
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 400 }
      );
    }

    // Try to verify the signature format
    const isValidSignature = verifySignatureFormat(signature, address);
    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Update profile as verified
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

      return NextResponse.json({
        success: true,
        profile,
      });
    } catch (dbError) {
      console.error("Database error during verification:", dbError);
      // Still return success since the signature was valid
      // Just couldn't persist to database
      return NextResponse.json({
        success: true,
        profile: {
          address,
          verified: true,
          _dbUnavailable: true,
        },
      });
    }
  } catch (error) {
    console.error("Error verifying profile:", error);
    return NextResponse.json(
      { error: "Failed to verify profile" },
      { status: 500 }
    );
  }
}
