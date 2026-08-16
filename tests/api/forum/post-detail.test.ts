import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma module - must be before imports
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      post: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      postRevision: {
        count: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    default: {
      post: { findUnique: vi.fn() },
    },
  };
});

import { GET, PATCH, DELETE } from "@/app/api/forum/posts/[id]/route";
import { prisma } from "@/lib/prisma";

// Type assertions for mocks
const mockPost = prisma.post as any;
const mockTransaction = prisma.$transaction as any;

const mockPostData = {
  id: "post-1",
  discussionId: "disc-1",
  author: "bc1qauthor",
  raw: "Test content",
  cooked: "<p>Test content</p>",
  postNumber: 1,
  isHidden: false,
  isEdited: false,
  discussion: {
    id: "disc-1",
    title: "Test Discussion",
    slug: "test-discussion",
  },
  replyTo: null,
  replies: [
    { id: "post-2", postNumber: 2, author: "bc1quser1" },
  ],
  reactions: [
    { type: "LIKE", user: "bc1quser1" },
    { type: "LIKE", user: "bc1quser2" },
    { type: "HEART", user: "bc1quser1" },
  ],
  revisions: [],
};

const mockSecondPost = {
  ...mockPostData,
  id: "post-2",
  postNumber: 2,
  author: "bc1quser1",
  replies: [],
};

describe("GET /api/forum/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns post with reactions", async () => {
    mockPost.findUnique.mockResolvedValue(mockPostData);

    const request = new NextRequest("http://localhost/api/forum/posts/post-1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.post.id).toBe("post-1");
    expect(data.post.reactionCounts.LIKE).toBe(2);
    expect(data.post.reactionCounts.HEART).toBe(1);
  });

  it("returns 404 for non-existent post", async () => {
    mockPost.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/forum/posts/non-existent"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Post not found");
  });

  it("includes discussion context", async () => {
    mockPost.findUnique.mockResolvedValue(mockPostData);

    const request = new NextRequest("http://localhost/api/forum/posts/post-1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const data = await response.json();

    expect(data.post.discussion.title).toBe("Test Discussion");
    expect(data.post.discussion.slug).toBe("test-discussion");
  });

  it("includes replies", async () => {
    mockPost.findUnique.mockResolvedValue(mockPostData);

    const request = new NextRequest("http://localhost/api/forum/posts/post-1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const data = await response.json();

    expect(data.post.replies).toHaveLength(1);
    expect(data.post.replies[0].postNumber).toBe(2);
  });

  it("handles database errors", async () => {
    mockPost.findUnique.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest("http://localhost/api/forum/posts/post-1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch post");
  });
});

// ---------------------------------------------------------------------------
// PATCH / DELETE — post edit and removal.
//
// Both handlers previously took an `author` value straight from the request
// and compared it to `post.author`. Since the caller supplies that value, the
// check was decorative: naming the victim was enough to edit or delete their
// post. `authorSig` was read and never verified.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import { buildSigningMessage, SIGNING_ACTIONS } from "@/lib/signing-message";
import { p2trWallet, testNonce } from "../../helpers/bip322-signer";

const ADMIN_TOKEN = "w5-test-operator-token-0123456789abcdef";
const postAuthor = p2trWallet("c3".repeat(32));
const attacker = p2trWallet("d4".repeat(32));

const authoredPost = { ...mockPostData, author: postAuthor.address };

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signedEdit(
  wallet: { address: string; sign(m: string): string },
  content: string,
  postId = authoredPost.id
) {
  const issuedAt = Date.now();
  const nonce = testNonce("f");
  const message = buildSigningMessage({
    action: SIGNING_ACTIONS.POST_EDIT,
    address: wallet.address,
    resource: `post:${postId}`,
    params: { contentSha256: sha256Hex(content) },
    issuedAt,
    nonce,
  });
  return {
    content,
    address: wallet.address,
    signature: wallet.sign(message),
    issuedAt,
    nonce,
  };
}

function signedDeleteQuery(
  wallet: { address: string; sign(m: string): string },
  postId = authoredPost.id
) {
  const issuedAt = Date.now();
  const nonce = testNonce("0");
  const message = buildSigningMessage({
    action: SIGNING_ACTIONS.POST_DELETE,
    address: wallet.address,
    resource: `post:${postId}`,
    issuedAt,
    nonce,
  });
  return new URLSearchParams({
    address: wallet.address,
    signature: wallet.sign(message),
    issuedAt: String(issuedAt),
    nonce,
  }).toString();
}

const patchParams = { params: Promise.resolve({ id: authoredPost.id }) };

describe("PATCH /api/forum/posts/[id] — authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FORUM_ADMIN_TOKEN = ADMIN_TOKEN;
    mockPost.findUnique.mockResolvedValue(authoredPost);
    mockTransaction.mockImplementation(async (fn: any) =>
      fn({
        postRevision: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
        post: {
          update: vi.fn().mockImplementation((args: any) =>
            Promise.resolve({ ...authoredPost, ...args.data })
          ),
        },
      })
    );
  });

  it("rejects the pre-fix request shape — naming the author is not proof", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          content: "Defaced",
          author: postAuthor.address,
          authorSig: "anything",
        }),
      }
    );

    const response = await PATCH(request, patchParams);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects a valid signature by somebody who is not the post author", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(signedEdit(attacker, "Defaced")),
      }
    );

    const response = await PATCH(request, patchParams);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only the post author or a moderator can do that");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects content swapped after signing", async () => {
    const body = signedEdit(postAuthor, "Original content");
    body.content = "Swapped content";

    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      { method: "PATCH", body: JSON.stringify(body) }
    );

    const response = await PATCH(request, patchParams);

    expect(response.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects a signature bound to a different post", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          signedEdit(postAuthor, "Content", "some-other-post-id")
        ),
      }
    );

    const response = await PATCH(request, patchParams);

    expect(response.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("POSITIVE: the post author can edit with a valid signature", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(signedEdit(postAuthor, "Updated content")),
      }
    );

    const response = await PATCH(request, patchParams);

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("POSITIVE: an operator can edit with the admin token", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ content: "Moderated content" }),
        headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      }
    );

    const response = await PATCH(request, patchParams);

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns 400 when content is missing", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      }
    );

    const response = await PATCH(request, patchParams);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: content");
  });

  it("returns 404 for a non-existent post", async () => {
    mockPost.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ content: "x" }),
        headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      }
    );

    const response = await PATCH(request, patchParams);

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/forum/posts/[id] — authentication", () => {
  const deletable = { ...authoredPost, postNumber: 2 };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FORUM_ADMIN_TOKEN = ADMIN_TOKEN;
    mockPost.findUnique.mockResolvedValue(deletable);
    mockPost.update.mockResolvedValue({ ...deletable, isHidden: true });
  });

  it("rejects the pre-fix request shape — ?author=<victim> is not proof", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${deletable.id}?author=${postAuthor.address}`,
      { method: "DELETE" }
    );

    const response = await DELETE(request, patchParams);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockPost.update).not.toHaveBeenCalled();
  });

  it("rejects a valid signature by somebody who is not the post author", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${deletable.id}?${signedDeleteQuery(attacker)}`,
      { method: "DELETE" }
    );

    const response = await DELETE(request, patchParams);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only the post author or a moderator can do that");
    expect(mockPost.update).not.toHaveBeenCalled();
  });

  it("POSITIVE: the post author can delete with a valid signature", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${deletable.id}?${signedDeleteQuery(postAuthor)}`,
      { method: "DELETE" }
    );

    const response = await DELETE(request, patchParams);

    expect(response.status).toBe(200);
    expect(mockPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isHidden: true } })
    );
  });

  it("POSITIVE: an operator can delete with the admin token", async () => {
    const request = new NextRequest(
      `http://localhost/api/forum/posts/${deletable.id}`,
      { method: "DELETE", headers: { authorization: `Bearer ${ADMIN_TOKEN}` } }
    );

    const response = await DELETE(request, patchParams);

    expect(response.status).toBe(200);
  });

  it("still refuses to delete the first post", async () => {
    mockPost.findUnique.mockResolvedValue({ ...authoredPost, postNumber: 1 });

    const request = new NextRequest(
      `http://localhost/api/forum/posts/${authoredPost.id}`,
      { method: "DELETE", headers: { authorization: `Bearer ${ADMIN_TOKEN}` } }
    );

    const response = await DELETE(request, patchParams);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Cannot delete the first post. Delete the discussion instead."
    );
  });
});
