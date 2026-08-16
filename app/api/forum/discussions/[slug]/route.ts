import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { safeCookedHtml } from "@/lib/markdown";
import { hasAdminCredentials, presentsAdminCredentials } from "@/lib/admin-auth";
import {
  presentsSignedCredentials,
  verifySignedAction,
} from "@/lib/request-auth";
import { SIGNING_ACTIONS, type ParamValue } from "@/lib/signing-message";

/**
 * GET /api/forum/discussions/[slug]
 * Get a discussion with all posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const viewer = searchParams.get("viewer"); // Bitcoin address of viewer

    // Get discussion by slug or ID
    const discussion = await prisma.discussion.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isHidden: false,
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
        proposal: {
          include: {
            votes: {
              take: 10,
              orderBy: { votingPower: "desc" },
            },
            _count: { select: { votes: true } },
          },
        },
        participants: {
          orderBy: { postsCount: "desc" },
          take: 10,
        },
      },
    });

    if (!discussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.discussion.update({
      where: { id: discussion.id },
      data: { viewsCount: { increment: 1 } },
    });

    // Get posts with pagination
    const [posts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          discussionId: discussion.id,
          isHidden: false,
        },
        orderBy: { postNumber: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reactions: {
            select: { type: true, user: true },
          },
          replyTo: {
            select: { id: true, postNumber: true, author: true },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.post.count({
        where: {
          discussionId: discussion.id,
          isHidden: false,
        },
      }),
    ]);

    // Get viewer's reading progress if viewer is specified
    let viewerParticipant = null;
    if (viewer) {
      viewerParticipant = await prisma.discussionParticipant.findUnique({
        where: {
          discussionId_user: {
            discussionId: discussion.id,
            user: viewer,
          },
        },
      });

      // Update last read
      if (viewerParticipant && posts.length > 0) {
        const lastPostNumber = posts[posts.length - 1].postNumber;
        if (lastPostNumber > viewerParticipant.lastReadPostNumber) {
          await prisma.discussionParticipant.update({
            where: { id: viewerParticipant.id },
            data: {
              lastReadPostNumber: lastPostNumber,
              lastReadAt: new Date(),
            },
          });
        }
      }
    }

    // Aggregate reaction counts per post
    const postsWithReactionCounts = posts.map((post) => {
      const reactionCounts: Record<string, number> = {};
      const userReactions: string[] = [];

      post.reactions.forEach((r) => {
        reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        if (viewer && r.user === viewer) {
          userReactions.push(r.type);
        }
      });

      return {
        ...post,
        // Re-render from the markdown source rather than trusting the stored
        // HTML. Rows written before markdown rendering was made safe can hold
        // live markup, and this response feeds dangerouslySetInnerHTML.
        cooked: safeCookedHtml(post.raw, post.cooked),
        reactionCounts,
        userReactions,
        reactions: undefined, // Remove raw reactions from response
      };
    });

    return NextResponse.json(serializeBigInt({
      discussion: {
        ...discussion,
        tags: discussion.tags.map((t) => t.tag),
      },
      posts: postsWithReactionCounts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        pages: Math.ceil(totalPosts / limit),
      },
      viewer: viewerParticipant
        ? {
            lastReadPostNumber: viewerParticipant.lastReadPostNumber,
            notificationLevel: viewerParticipant.notificationLevel,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching discussion:", error);
    return NextResponse.json(
      { error: "Failed to fetch discussion" },
      { status: 500 }
    );
  }
}

/** Fields only an operator may change. */
const MODERATOR_ONLY_FIELDS = ["isPinned", "isHidden"] as const;

/** Fields the discussion's own author may change, as well as an operator. */
const AUTHOR_FIELDS = ["title", "isLocked"] as const;

const MAX_TITLE_LENGTH = 200;

/**
 * PATCH /api/forum/discussions/[slug]
 * Update a discussion (lock, pin, hide, edit title).
 *
 * Before: no authentication of any kind. The handler read `author` and
 * `authorSig` from the body, checked neither, and applied whatever moderation
 * flags the caller asked for — so anybody could lock, pin, hide or retitle any
 * thread on the site.
 *
 * Now, two ways to authorise, and nothing else:
 *
 *   - OPERATOR — `Authorization: Bearer <FORUM_ADMIN_TOKEN>`. May change any
 *     field, including `isPinned` and `isHidden`.
 *   - THREAD AUTHOR — a BIP-322 signature over the canonical
 *     `thread:moderate` message, bound to this discussion's id and to the
 *     exact set of changes requested. May change `title` and `isLocked` only.
 *
 * Because the signed message carries the change set, a signature obtained for
 * one edit cannot be replayed to make a different one.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const title = body?.title;

    // Refuse before the lookup, so an unauthenticated caller cannot tell a
    // thread that exists from one that does not.
    if (
      !presentsAdminCredentials(request) &&
      !presentsSignedCredentials(body ?? {})
    ) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get discussion
    const discussion = await prisma.discussion.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!discussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      );
    }

    // ---- what is being asked for -------------------------------------------
    const changes: Record<string, ParamValue> = {};
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { error: "title must be a non-empty string" },
          { status: 400 }
        );
      }
      if (title.length > MAX_TITLE_LENGTH) {
        return NextResponse.json(
          { error: `title must be ${MAX_TITLE_LENGTH} characters or less` },
          { status: 400 }
        );
      }
      changes.title = title;
    }
    for (const field of ["isLocked", "isPinned", "isHidden"] as const) {
      const value = body?.[field];
      if (value === undefined) continue;
      if (typeof value !== "boolean") {
        return NextResponse.json(
          { error: `${field} must be a boolean` },
          { status: 400 }
        );
      }
      changes[field] = value;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: "No supported fields to update" },
        { status: 400 }
      );
    }

    // ---- authorise ---------------------------------------------------------
    const isOperator = hasAdminCredentials(request);

    if (!isOperator) {
      if (presentsAdminCredentials(request)) {
        return NextResponse.json(
          { error: "Invalid administrative credentials" },
          { status: 403 }
        );
      }

      const wantsModeratorField = MODERATOR_ONLY_FIELDS.some(
        (field) => changes[field] !== undefined
      );
      if (wantsModeratorField) {
        return NextResponse.json(
          {
            error: `${MODERATOR_ONLY_FIELDS.join(" and ")} may only be changed by a moderator`,
          },
          { status: 403 }
        );
      }

      const auth = await verifySignedAction({
        action: SIGNING_ACTIONS.THREAD_MODERATE,
        address: body?.address,
        signature: body?.signature,
        issuedAt: body?.issuedAt,
        nonce: body?.nonce,
        resource: `discussion:${discussion.id}`,
        params: changes,
      });

      if (!auth.ok) {
        return NextResponse.json(
          { error: auth.error },
          { status: auth.status }
        );
      }

      if (body.address !== discussion.author) {
        return NextResponse.json(
          { error: "Only the thread author or a moderator can do that" },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    for (const field of [...AUTHOR_FIELDS, ...MODERATOR_ONLY_FIELDS]) {
      if (changes[field] !== undefined) updateData[field] = changes[field];
    }

    const updated = await prisma.discussion.update({
      where: { id: discussion.id },
      data: updateData,
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ discussion: updated });
  } catch (error) {
    console.error("Error updating discussion:", error);
    return NextResponse.json(
      { error: "Failed to update discussion" },
      { status: 500 }
    );
  }
}
