import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { renderMarkdown, safeCookedHtml } from "@/lib/markdown";
import { hasAdminCredentials, presentsAdminCredentials } from "@/lib/admin-auth";
import {
  presentsSignedCredentials,
  verifySignedAction,
} from "@/lib/request-auth";
import { SIGNING_ACTIONS, type SigningAction } from "@/lib/signing-message";

/**
 * Bind a signature to the exact content it authorises, without putting a
 * whole post body inside a one-line message field.
 */
function contentDigest(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Authorise a change to somebody else's post.
 *
 * Before: both handlers took an `author` value straight from the request and
 * compared it to `post.author`. Since the caller supplies that value, anyone
 * could edit or delete anyone's post by naming them. The `authorSig` field was
 * read and never checked.
 *
 * Now: an operator token, or a BIP-322 signature by the post's actual author
 * over a message bound to this post id and this specific change.
 */
async function authorisePostChange(
  request: NextRequest,
  action: SigningAction,
  postId: string,
  postAuthor: string,
  credentials: {
    address?: unknown;
    signature?: unknown;
    issuedAt?: unknown;
    nonce?: unknown;
  },
  params?: Record<string, string>
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (hasAdminCredentials(request)) return { ok: true };

  if (presentsAdminCredentials(request)) {
    return {
      ok: false,
      status: 403,
      error: "Invalid administrative credentials",
    };
  }

  const auth = await verifySignedAction({
    action,
    address: credentials.address,
    signature: credentials.signature,
    issuedAt: credentials.issuedAt,
    nonce: credentials.nonce,
    resource: `post:${postId}`,
    params,
  });

  if (!auth.ok) return auth;

  if (credentials.address !== postAuthor) {
    return {
      ok: false,
      status: 403,
      error: "Only the post author or a moderator can do that",
    };
  }

  return { ok: true };
}

/**
 * GET /api/forum/posts/[id]
 * Get a single post with context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        discussion: {
          select: { id: true, title: true, slug: true },
        },
        replyTo: {
          select: { id: true, postNumber: true, author: true, raw: true },
        },
        replies: {
          select: { id: true, postNumber: true, author: true },
          take: 10,
        },
        reactions: {
          select: { type: true, user: true },
        },
        revisions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Aggregate reaction counts
    const reactionCounts: Record<string, number> = {};
    post.reactions.forEach((r) => {
      reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
    });

    return NextResponse.json({
      post: {
        ...post,
        // See the note in the discussion GET: never hand stored HTML straight
        // to a client that injects it.
        cooked: safeCookedHtml(post.raw, post.cooked),
        reactionCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/forum/posts/[id]
 * Edit a post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, editReason } = body ?? {};

    if (typeof content !== "string" || content === "") {
      return NextResponse.json(
        { error: "Missing required field: content" },
        { status: 400 }
      );
    }

    // Refuse before the lookup, so an unauthenticated caller cannot tell a
    // post that exists from one that does not.
    if (
      !presentsAdminCredentials(request) &&
      !presentsSignedCredentials(body ?? {})
    ) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const auth = await authorisePostChange(
      request,
      SIGNING_ACTIONS.POST_EDIT,
      id,
      post.author,
      body ?? {},
      { contentSha256: contentDigest(content) }
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // The revision row records who performed the edit.
    const author = hasAdminCredentials(request)
      ? post.author
      : (body.address as string);

    // Render markdown to HTML that is safe to inject (lib/markdown.ts).
    const cooked = renderMarkdown(content);

    // Update post and create revision in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Get current revision count
      const revisionCount = await tx.postRevision.count({
        where: { postId: id },
      });

      // Save current content as revision
      await tx.postRevision.create({
        data: {
          postId: id,
          raw: post.raw,
          cooked: post.cooked,
          editedBy: author,
          editReason,
          version: revisionCount + 1,
        },
      });

      // Update post
      return tx.post.update({
        where: { id },
        data: {
          raw: content,
          cooked,
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          discussion: { select: { id: true, title: true, slug: true } },
          _count: { select: { replies: true, revisions: true } },
        },
      });
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forum/posts/[id]
 * Soft delete a post (hide it)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteCredentials = {
      address: searchParams.get("address") ?? undefined,
      signature: searchParams.get("signature") ?? undefined,
      issuedAt: searchParams.get("issuedAt") ?? undefined,
      nonce: searchParams.get("nonce") ?? undefined,
    };

    if (
      !presentsAdminCredentials(request) &&
      !presentsSignedCredentials(deleteCredentials)
    ) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const auth = await authorisePostChange(
      request,
      SIGNING_ACTIONS.POST_DELETE,
      id,
      post.author,
      deleteCredentials
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Can't delete the first post (use discussion delete instead)
    if (post.postNumber === 1) {
      return NextResponse.json(
        { error: "Cannot delete the first post. Delete the discussion instead." },
        { status: 400 }
      );
    }

    // Soft delete by hiding
    await prisma.post.update({
      where: { id },
      data: { isHidden: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
