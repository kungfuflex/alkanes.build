"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { formatAddress, cn } from "@/lib/utils";

interface Post {
  id: string;
  raw: string;
  cooked: string;
  author: string;
  postNumber: number;
  postType: "REGULAR" | "MODERATOR" | "SYSTEM" | "WHISPER";
  isEdited: boolean;
  editedAt?: string;
  likesCount: number;
  repliesCount: number;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  replyTo?: {
    id: string;
    postNumber: number;
    author: string;
  };
  createdAt: string;
}

interface Discussion {
  id: string;
  title: string;
  slug: string;
  author: string;
  type: "GENERAL" | "PROPOSAL" | "ANNOUNCEMENT" | "QUESTION";
  isPinned: boolean;
  isLocked: boolean;
  postsCount: number;
  viewsCount: number;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
  };
  tags: Array<{ id: string; name: string; slug: string; color: string }>;
  proposal?: {
    id: string;
    title: string;
    state: string;
    choices: string[];
    scores: number[];
    totalVotes: bigint;
  };
  createdAt: string;
}

const REACTION_EMOJIS: Record<string, string> = {
  LIKE: "👍",
  HEART: "❤️",
  CELEBRATE: "🎉",
  THINKING: "🤔",
  DISAGREE: "👎",
};

export default function DiscussionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { address, isConnected, signMessage } = useWallet();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDiscussion();
  }, [slug, address]);

  async function fetchDiscussion() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (address) params.set("viewer", address);

      const res = await fetch(`/api/forum/discussions/${slug}?${params}`);
      const data = await res.json();

      if (data.discussion) {
        setDiscussion(data.discussion);
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Failed to fetch discussion:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReply() {
    if (!replyContent.trim() || !isConnected || !address || !discussion) return;

    setSubmitting(true);
    try {
      // TODO: Sign the post content with BIP-322
      // const signature = await signMessage(replyContent);

      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussionId: discussion.id,
          content: replyContent,
          author: address,
          replyToId: replyingTo?.id,
        }),
      });

      if (res.ok) {
        setReplyContent("");
        setReplyingTo(null);
        fetchDiscussion(); // Refresh posts
      } else {
        const data = await res.json();
        alert(data.error || "Failed to post reply");
      }
    } catch (error) {
      console.error("Failed to submit reply:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReaction(postId: string, type: string) {
    if (!isConnected || !address) return;

    try {
      const res = await fetch("/api/forum/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, user: address, type }),
      });

      if (res.ok) {
        // Update local state
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;

            const wasReacted = post.userReactions.includes(type);
            const newUserReactions = wasReacted
              ? post.userReactions.filter((r) => r !== type)
              : [...post.userReactions, type];
            const newCounts = { ...post.reactionCounts };
            newCounts[type] = (newCounts[type] || 0) + (wasReacted ? -1 : 1);

            return {
              ...post,
              userReactions: newUserReactions,
              reactionCounts: newCounts,
            };
          })
        );
      }
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-alkane-500" />
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-slate-400 mb-4">This discussion doesn't exist</p>
          <Link href="/forum" className="text-alkane-400 hover:text-alkane-300">
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/forum"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: `${discussion.category.color}20`,
                color: discussion.category.color,
              }}
            >
              {discussion.category.name}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Discussion header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            {discussion.isPinned && (
              <span className="text-amber-400 text-sm">Pinned</span>
            )}
            {discussion.isLocked && (
              <span className="text-slate-500 text-sm">🔒 Locked</span>
            )}
            {discussion.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded text-xs"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{discussion.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>by {formatAddress(discussion.author)}</span>
            <span>&middot;</span>
            <span>{formatRelativeTime(discussion.createdAt)}</span>
            <span>&middot;</span>
            <span>{discussion.postsCount} posts</span>
            <span>&middot;</span>
            <span>{discussion.viewsCount} views</span>
          </div>
        </div>

        {/* Linked proposal card */}
        {discussion.proposal && (
          <div className="glass rounded-xl p-4 mb-6 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-400 mb-1">Linked Proposal</div>
                <h3 className="text-white font-medium">{discussion.proposal.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    discussion.proposal.state === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                    discussion.proposal.state === "CLOSED" ? "bg-slate-500/20 text-slate-400" :
                    "bg-amber-500/20 text-amber-400"
                  )}>
                    {discussion.proposal.state}
                  </span>
                </div>
              </div>
              <Link
                href={`/governance?proposal=${discussion.proposal.id}`}
                className="btn-secondary text-sm px-4 py-2 rounded-lg"
              >
                View Proposal
              </Link>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post, index) => (
            <article
              key={post.id}
              id={`post-${post.postNumber}`}
              className={cn(
                "glass rounded-xl p-6",
                post.postType === "SYSTEM" && "bg-blue-500/10 border border-blue-500/30",
                post.postType === "MODERATOR" && "bg-amber-500/10 border border-amber-500/30"
              )}
            >
              {/* Post header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-alkane-500 to-diesel-500 flex items-center justify-center text-white font-bold">
                    {post.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {formatAddress(post.author)}
                      </span>
                      {post.author === discussion.author && (
                        <span className="text-xs bg-alkane-500/20 text-alkane-400 px-1.5 py-0.5 rounded">
                          OP
                        </span>
                      )}
                      {post.postType === "MODERATOR" && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                          MOD
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatRelativeTime(post.createdAt)}
                      {post.isEdited && (
                        <span className="ml-2">(edited)</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500">#{post.postNumber}</span>
              </div>

              {/* Reply context */}
              {post.replyTo && (
                <div className="mb-3 p-2 bg-slate-800/50 rounded-lg border-l-2 border-slate-600">
                  <a
                    href={`#post-${post.replyTo.postNumber}`}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Replying to #{post.replyTo.postNumber} by {formatAddress(post.replyTo.author)}
                  </a>
                </div>
              )}

              {/* Post content */}
              <div
                className="prose prose-invert prose-slate max-w-none mb-4"
                dangerouslySetInnerHTML={{ __html: post.cooked }}
              />

              {/* Reactions and actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
                    const count = post.reactionCounts[type] || 0;
                    const isActive = post.userReactions.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => handleReaction(post.id, type)}
                        disabled={!isConnected}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-alkane-500/20 text-alkane-400"
                            : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50",
                          !isConnected && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  {!discussion.isLocked && isConnected && (
                    <button
                      onClick={() => setReplyingTo(post)}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Reply form */}
        {!discussion.isLocked && (
          <div className="mt-8 glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {replyingTo
                ? `Replying to #${replyingTo.postNumber}`
                : "Add a Reply"}
            </h3>
            {replyingTo && (
              <div className="mb-4 flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-400">
                  Replying to {formatAddress(replyingTo.author)}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-500 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {isConnected ? (
              <>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply... (Markdown supported)"
                  className="w-full h-32 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-alkane-500"
                />
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-slate-500">
                    Mention users with @address
                  </p>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || submitting}
                    className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50"
                  >
                    {submitting ? "Posting..." : "Post Reply"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-center py-4">
                Connect your wallet to reply to this discussion
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
