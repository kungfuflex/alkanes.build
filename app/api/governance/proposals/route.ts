import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marked } from "marked";
import { serializeBigInt } from "@/lib/serialize";
import { alkanesClient } from "@/lib/alkanes-client";
import { verifyMessageSignature } from "@/lib/bip322";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/**
 * GET /api/governance/proposals
 * List all proposals with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const state = searchParams.get("state");
    const author = searchParams.get("author");

    const where: any = {};
    if (state) {
      where.state = state.toUpperCase();
    }
    if (author) {
      where.author = author;
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { votes: true },
          },
          discussion: {
            select: {
              id: true,
              slug: true,
              postsCount: true,
              viewsCount: true,
            },
          },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      proposals: serializeBigInt(proposals),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    // Return empty results instead of 500 so frontend renders gracefully
    return NextResponse.json({
      proposals: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    });
  }
}

/**
 * POST /api/governance/proposals
 * Create a new proposal with auto-created discussion thread
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      body: proposalBody,
      choices,
      author,
      authorSig,
      authorPubkey,
      timestamp,
      createDiscussion = true, // Auto-create discussion by default
    } = body;

    // Validate required fields
    if (!title || !proposalBody || !choices || !author || !authorSig) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate choices
    if (!Array.isArray(choices) || choices.length < 2) {
      return NextResponse.json(
        { error: "At least 2 choices are required" },
        { status: 400 }
      );
    }

    // Verify signature
    const network = process.env.NEXT_PUBLIC_NETWORK as 'mainnet' | 'testnet' | 'regtest' || 'mainnet';
    const messageToVerify = JSON.stringify({
      title: title.trim(),
      body: proposalBody.trim(),
      choices,
      timestamp: timestamp || Date.now(),
    });

    console.log('[Proposal] Verifying signature:', {
      author,
      title: title.slice(0, 30),
      timestamp,
      sigLength: authorSig?.length,
      pubkeyLength: authorPubkey?.length,
    });

    const isValidSignature = await verifyMessageSignature(
      messageToVerify,
      author,
      authorSig,
      network,
      authorPubkey
    );

    console.log('[Proposal] Signature verification result:', isValidSignature);

    if (!isValidSignature) {
      console.warn('[Proposal] Signature verification failed');
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Get governance settings
    const settings = await prisma.governanceSettings.findFirst();
    const votingDelay = settings?.votingDelay || 0;
    const votingPeriod = settings?.votingPeriod || 17280; // ~3 days in blocks
    // 10 DIESEL = 10 * 10^6 = 10,000,000 (6 decimals)
    const proposalThreshold = BigInt('10000000'); // Always use 10 DIESEL, ignore DB for now

    // Get current block height for snapshot
    const currentHeight = await alkanesClient.getCurrentHeight();
    const snapshotBlock = currentHeight;

    // Check author has minimum DIESEL balance to create proposal
    const authorBalance = await alkanesClient.getDieselBalanceAtBlock(author, snapshotBlock);
    console.log('[Proposal] Author balance check:', { author, balance: authorBalance.toString(), threshold: proposalThreshold.toString() });

    if (authorBalance < proposalThreshold) {
      return NextResponse.json(
        { error: `Insufficient DIESEL balance. Required: ${Number(proposalThreshold) / 1e6} DIESEL` },
        { status: 403 }
      );
    }

    // Calculate start and end times
    // For now, using timestamps - in production would use block heights
    const now = new Date();
    const start = new Date(now.getTime() + votingDelay * 10 * 60 * 1000); // ~10 min per block
    const end = new Date(start.getTime() + votingPeriod * 10 * 60 * 1000);

    // Initialize scores array
    const scores = choices.map(() => "0");

    // Create proposal and optionally a linked discussion
    const result = await prisma.$transaction(async (tx) => {
      // Create proposal
      const proposal = await tx.proposal.create({
        data: {
          title,
          body: proposalBody,
          choices,
          author,
          authorSig,
          snapshot: snapshotBlock,
          start,
          end,
          scores,
          state: votingDelay > 0 ? "PENDING" : "ACTIVE",
        },
      });

      let discussion = null;

      if (createDiscussion) {
        // Find or create the governance category
        let category = await tx.category.findUnique({
          where: { slug: "governance" },
        });

        if (!category) {
          category = await tx.category.create({
            data: {
              name: "Governance Proposals",
              slug: "governance",
              description: "Discussion of active and pending governance proposals",
              color: "#10b981",
              position: 1,
            },
          });
        }

        // Generate unique slug for discussion
        let slug = `proposal-${generateSlug(title)}`;
        let suffix = 0;
        while (await tx.discussion.findUnique({ where: { slug } })) {
          suffix++;
          slug = `proposal-${generateSlug(title)}-${suffix}`;
        }

        // Parse proposal body to HTML
        const cooked = await marked.parse(proposalBody);

        // Create discussion linked to proposal
        discussion = await tx.discussion.create({
          data: {
            title: `[Proposal] ${title}`,
            slug,
            author,
            authorSig,
            categoryId: category.id,
            proposalId: proposal.id,
            type: "PROPOSAL",
            postsCount: 1,
            lastPostAt: new Date(),
          },
        });

        // Create first post with proposal content
        await tx.post.create({
          data: {
            discussionId: discussion.id,
            author,
            authorSig,
            raw: proposalBody,
            cooked,
            postNumber: 1,
            postType: "REGULAR",
          },
        });

        // Add author as participant
        await tx.discussionParticipant.create({
          data: {
            discussionId: discussion.id,
            user: author,
            postsCount: 1,
            notificationLevel: "WATCHING",
          },
        });

        // Update user profile
        await tx.userProfile.upsert({
          where: { address: author },
          create: {
            address: author,
            discussionsCount: 1,
            postsCount: 1,
          },
          update: {
            discussionsCount: { increment: 1 },
            postsCount: { increment: 1 },
          },
        });
      }

      return { proposal, discussion };
    });

    // Fetch full proposal with discussion
    const fullProposal = await prisma.proposal.findUnique({
      where: { id: result.proposal.id },
      include: {
        discussion: {
          select: { id: true, slug: true },
        },
      },
    });

    return NextResponse.json({ proposal: serializeBigInt(fullProposal) }, { status: 201 });
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}
