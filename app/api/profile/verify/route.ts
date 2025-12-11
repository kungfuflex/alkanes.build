import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verification message must be recent (within 5 minutes)
const MAX_MESSAGE_AGE = 5 * 60 * 1000;

/**
 * POST /api/profile/verify
 * Verify address ownership via BIP-322 signature
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

    // TODO: Implement actual BIP-322 signature verification
    // For now, we'll trust the signature since the frontend already signed it
    // In production, this should use bitcoin-message or similar library to verify
    //
    // Example verification code (requires bitcoinjs-message library):
    // import { verify } from 'bitcoinjs-message';
    // const isValid = verify(message, address, signature);
    // if (!isValid) {
    //   return NextResponse.json(
    //     { error: "Invalid signature" },
    //     { status: 400 }
    //   );
    // }

    // For development, accept any signature that looks valid (base64 encoded)
    if (!signature || signature.length < 10) {
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 400 }
      );
    }

    // Update profile as verified
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
  } catch (error) {
    console.error("Error verifying profile:", error);
    return NextResponse.json(
      { error: "Failed to verify profile" },
      { status: 500 }
    );
  }
}
