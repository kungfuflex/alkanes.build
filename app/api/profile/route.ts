import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/profile
 * Get user profile by address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.findUnique({
      where: { address },
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
        likesGiven: true,
        trustLevel: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile
 * Create or update user profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, displayName, bio, avatarUrl } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Validate displayName length
    if (displayName && displayName.length > 50) {
      return NextResponse.json(
        { error: "Display name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Validate bio length
    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Sanitize displayName (remove any potentially harmful characters)
    const sanitizedDisplayName = displayName
      ? displayName.trim().replace(/[<>]/g, "")
      : null;

    // Upsert profile
    const profile = await prisma.userProfile.upsert({
      where: { address },
      create: {
        address,
        displayName: sanitizedDisplayName,
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl || null,
        lastSeenAt: new Date(),
      },
      update: {
        displayName: sanitizedDisplayName,
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl || null,
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

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
