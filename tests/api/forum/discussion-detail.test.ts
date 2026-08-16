import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma module - must be before imports
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      discussion: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      post: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      discussionParticipant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
    default: {
      discussion: { findFirst: vi.fn() },
    },
  };
});

import { GET, PATCH } from "@/app/api/forum/discussions/[slug]/route";
import { prisma } from "@/lib/prisma";

// Type assertions for mocks
const mockDiscussion = prisma.discussion as any;
const mockPost = prisma.post as any;
const mockParticipant = prisma.discussionParticipant as any;

const mockCategory = {
  id: "cat-1",
  name: "General",
  slug: "general",
  color: "#6366f1",
};

const mockDiscussionData = {
  id: "disc-1",
  title: "Test Discussion",
  slug: "test-discussion",
  author: "bc1qauthor",
  categoryId: "cat-1",
  type: "GENERAL",
  isPinned: false,
  isLocked: false,
  isHidden: false,
  postsCount: 5,
  viewsCount: 100,
  category: mockCategory,
  tags: [{ tag: { id: "tag-1", name: "Test", slug: "test", color: "#000" } }],
  proposal: null,
  participants: [
    { user: "bc1qauthor", postsCount: 3 },
    { user: "bc1quser1", postsCount: 2 },
  ],
};

const mockPosts = [
  {
    id: "post-1",
    discussionId: "disc-1",
    author: "bc1qauthor",
    raw: "First post",
    cooked: "<p>First post</p>",
    postNumber: 1,
    isHidden: false,
    reactions: [
      { type: "LIKE", user: "bc1quser1" },
      { type: "LIKE", user: "bc1quser2" },
    ],
    replyTo: null,
    _count: { replies: 1 },
  },
  {
    id: "post-2",
    discussionId: "disc-1",
    author: "bc1quser1",
    raw: "Reply post",
    cooked: "<p>Reply post</p>",
    postNumber: 2,
    isHidden: false,
    reactions: [],
    replyTo: { id: "post-1", postNumber: 1, author: "bc1qauthor" },
    _count: { replies: 0 },
  },
];

describe("GET /api/forum/discussions/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns discussion with posts", async () => {
    mockDiscussion.findFirst.mockResolvedValue(mockDiscussionData);
    mockDiscussion.update.mockResolvedValue(mockDiscussionData);
    mockPost.findMany.mockResolvedValue(mockPosts);
    mockPost.count.mockResolvedValue(2);

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.discussion.id).toBe("disc-1");
    expect(data.posts).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
  });

  it("returns 404 for non-existent discussion", async () => {
    mockDiscussion.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/non-existent"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Discussion not found");
  });

  it("increments view count", async () => {
    mockDiscussion.findFirst.mockResolvedValue(mockDiscussionData);
    mockDiscussion.update.mockResolvedValue(mockDiscussionData);
    mockPost.findMany.mockResolvedValue([]);
    mockPost.count.mockResolvedValue(0);

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion"
    );
    await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });

    expect(mockDiscussion.update).toHaveBeenCalledWith({
      where: { id: "disc-1" },
      data: { viewsCount: { increment: 1 } },
    });
  });

  it("handles pagination", async () => {
    mockDiscussion.findFirst.mockResolvedValue(mockDiscussionData);
    mockDiscussion.update.mockResolvedValue(mockDiscussionData);
    mockPost.findMany.mockResolvedValue([]);
    mockPost.count.mockResolvedValue(100);

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion?page=2&limit=20"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });
    const data = await response.json();

    expect(mockPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      })
    );
    expect(data.pagination.pages).toBe(5);
  });

  it("aggregates reaction counts", async () => {
    mockDiscussion.findFirst.mockResolvedValue(mockDiscussionData);
    mockDiscussion.update.mockResolvedValue(mockDiscussionData);
    mockPost.findMany.mockResolvedValue(mockPosts);
    mockPost.count.mockResolvedValue(2);

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });
    const data = await response.json();

    expect(data.posts[0].reactionCounts.LIKE).toBe(2);
  });

  it("tracks viewer reading progress", async () => {
    mockDiscussion.findFirst.mockResolvedValue(mockDiscussionData);
    mockDiscussion.update.mockResolvedValue(mockDiscussionData);
    mockPost.findMany.mockResolvedValue(mockPosts);
    mockPost.count.mockResolvedValue(2);
    mockParticipant.findUnique.mockResolvedValue({
      id: "part-1",
      discussionId: "disc-1",
      user: "bc1qviewer",
      lastReadPostNumber: 1,
      notificationLevel: "WATCHING",
    });
    mockParticipant.update.mockResolvedValue({});

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion?viewer=bc1qviewer"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });
    const data = await response.json();

    expect(data.viewer).toBeDefined();
    expect(data.viewer.lastReadPostNumber).toBe(1);
    expect(mockParticipant.update).toHaveBeenCalled();
  });

  it("transforms tags in response", async () => {
    mockDiscussion.findFirst.mockResolvedValue(mockDiscussionData);
    mockDiscussion.update.mockResolvedValue(mockDiscussionData);
    mockPost.findMany.mockResolvedValue([]);
    mockPost.count.mockResolvedValue(0);

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });
    const data = await response.json();

    expect(data.discussion.tags[0].name).toBe("Test");
  });

  it("handles database errors", async () => {
    mockDiscussion.findFirst.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost/api/forum/discussions/test-discussion"
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-discussion" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch discussion");
  });
});

// ---------------------------------------------------------------------------
// PATCH — thread moderation.
//
// This handler previously applied whatever moderation flags the caller asked
// for, with no authentication of any kind: anybody could lock, pin, hide or
// retitle any thread. These tests use real keys and real signatures, so the
// negatives fail for cryptographic reasons rather than because a stub said no.
// ---------------------------------------------------------------------------

import {
  buildSigningMessage,
  SIGNING_ACTIONS,
  type ParamValue,
} from "@/lib/signing-message";
import { p2trWallet, testNonce } from "../../helpers/bip322-signer";

const ADMIN_TOKEN = "w5-test-operator-token-0123456789abcdef";
const author = p2trWallet("a1".repeat(32));
const stranger = p2trWallet("b2".repeat(32));

const authoredDiscussion = { ...mockDiscussionData, author: author.address };

function signedBody(
  wallet: { address: string; sign(m: string): string },
  changes: Record<string, ParamValue>,
  overrides: Record<string, unknown> = {}
) {
  const issuedAt = Date.now();
  const nonce = testNonce("c");
  const message = buildSigningMessage({
    action: SIGNING_ACTIONS.THREAD_MODERATE,
    address: wallet.address,
    resource: `discussion:${authoredDiscussion.id}`,
    params: changes,
    issuedAt,
    nonce,
  });
  return {
    ...changes,
    address: wallet.address,
    signature: wallet.sign(message),
    issuedAt,
    nonce,
    ...overrides,
  };
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(
    "http://localhost/api/forum/discussions/test-discussion",
    { method: "PATCH", body: JSON.stringify(body), headers }
  );
}

const patchParams = { params: Promise.resolve({ slug: "test-discussion" }) };

describe("PATCH /api/forum/discussions/[slug] — authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FORUM_ADMIN_TOKEN = ADMIN_TOKEN;
    mockDiscussion.findFirst.mockResolvedValue(authoredDiscussion);
    mockDiscussion.update.mockImplementation((args: any) =>
      Promise.resolve({ ...authoredDiscussion, ...args.data })
    );
  });

  describe("rejects unauthenticated and forged requests", () => {
    it("rejects a bare request with no credentials", async () => {
      const response = await PATCH(
        patchRequest({ title: "Hijacked" }),
        patchParams
      );

      expect(response.status).toBe(401);
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("refuses before the lookup, so it cannot be used to enumerate threads", async () => {
      const response = await PATCH(
        patchRequest({ title: "Probe" }),
        patchParams
      );

      expect(response.status).toBe(401);
      // A 404 here would tell an unauthenticated caller the thread exists.
      expect(mockDiscussion.findFirst).not.toHaveBeenCalled();
    });

    it("rejects the exact pre-fix request shape (author + authorSig, unverified)", async () => {
      const response = await PATCH(
        patchRequest({
          title: "Hijacked",
          isLocked: true,
          author: author.address,
          authorSig: "anything-at-all",
        }),
        patchParams
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("rejects a tampered signature", async () => {
      const body = signedBody(author, { title: "Legit" });
      body.signature = Buffer.alloc(64, "z").toString("base64");

      const response = await PATCH(patchRequest(body), patchParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid signature");
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("rejects a valid signature by someone who is not the thread author", async () => {
      const response = await PATCH(
        patchRequest(signedBody(stranger, { title: "Hijacked" })),
        patchParams
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "Only the thread author or a moderator can do that"
      );
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("rejects a signature bound to a different change (no param swapping)", async () => {
      // Signed for isLocked=true, submitted as isLocked=false.
      const body = signedBody(author, { isLocked: true });
      body.isLocked = false;

      const response = await PATCH(patchRequest(body), patchParams);

      expect(response.status).toBe(401);
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("rejects a signature for a different action replayed as moderation", async () => {
      const issuedAt = Date.now();
      const nonce = testNonce("d");
      const otherAction = buildSigningMessage({
        action: SIGNING_ACTIONS.PROFILE_VERIFY,
        address: author.address,
        resource: `address:${author.address}`,
        issuedAt,
        nonce,
      });

      const response = await PATCH(
        patchRequest({
          title: "Hijacked",
          address: author.address,
          signature: author.sign(otherAction),
          issuedAt,
          nonce,
        }),
        patchParams
      );

      expect(response.status).toBe(401);
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("rejects an expired signature", async () => {
      const issuedAt = Date.now() - 10 * 60 * 1000;
      const nonce = testNonce("e");
      const message = buildSigningMessage({
        action: SIGNING_ACTIONS.THREAD_MODERATE,
        address: author.address,
        resource: `discussion:${authoredDiscussion.id}`,
        params: { title: "Stale" },
        issuedAt,
        nonce,
      });

      const response = await PATCH(
        patchRequest({
          title: "Stale",
          address: author.address,
          signature: author.sign(message),
          issuedAt,
          nonce,
        }),
        patchParams
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("expired");
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("refuses to let the thread author pin or hide", async () => {
      for (const field of ["isPinned", "isHidden"]) {
        const response = await PATCH(
          patchRequest(signedBody(author, { [field]: true })),
          patchParams
        );
        expect(response.status).toBe(403);
      }
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });

    it("rejects a wrong operator token", async () => {
      const response = await PATCH(
        patchRequest(
          { isPinned: true },
          { authorization: "Bearer not-the-real-token-but-long-enough-xx" }
        ),
        patchParams
      );

      expect(response.status).toBe(403);
      expect(mockDiscussion.update).not.toHaveBeenCalled();
    });
  });

  describe("positive controls — the legitimate paths still work", () => {
    it("lets the thread author retitle with a valid signature", async () => {
      const response = await PATCH(
        patchRequest(signedBody(author, { title: "Updated Title" })),
        patchParams
      );

      expect(response.status).toBe(200);
      expect(mockDiscussion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { title: "Updated Title" },
        })
      );
    });

    it("lets the thread author lock with a valid signature", async () => {
      const response = await PATCH(
        patchRequest(signedBody(author, { isLocked: true })),
        patchParams
      );

      expect(response.status).toBe(200);
      expect(mockDiscussion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isLocked: true } })
      );
    });

    it("lets an operator pin and hide", async () => {
      const response = await PATCH(
        patchRequest(
          { isPinned: true, isHidden: true },
          { authorization: `Bearer ${ADMIN_TOKEN}` }
        ),
        patchParams
      );

      expect(response.status).toBe(200);
      expect(mockDiscussion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isPinned: true, isHidden: true },
        })
      );
    });
  });

  describe("request handling", () => {
    it("returns 404 for a non-existent discussion", async () => {
      mockDiscussion.findFirst.mockResolvedValue(null);

      const response = await PATCH(
        patchRequest(
          { title: "x" },
          { authorization: `Bearer ${ADMIN_TOKEN}` }
        ),
        patchParams
      );

      expect(response.status).toBe(404);
    });

    it("returns 400 when no supported field is present", async () => {
      const response = await PATCH(
        patchRequest({}, { authorization: `Bearer ${ADMIN_TOKEN}` }),
        patchParams
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No supported fields to update");
    });

    it("handles database errors", async () => {
      mockDiscussion.update.mockRejectedValue(new Error("DB down"));

      const response = await PATCH(
        patchRequest(
          { title: "x" },
          { authorization: `Bearer ${ADMIN_TOKEN}` }
        ),
        patchParams
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update discussion");
    });
  });
});
