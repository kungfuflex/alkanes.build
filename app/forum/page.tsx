"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { formatAddress, cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  _count: { discussions: number };
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
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
  likesCount: number;
  bumpedAt: string;
  createdAt: string;
  category: Category;
  tags: Tag[];
  proposal?: {
    id: string;
    title: string;
    state: string;
  };
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  GENERAL: { label: "Discussion", color: "bg-slate-500" },
  PROPOSAL: { label: "Proposal", color: "bg-emerald-500" },
  ANNOUNCEMENT: { label: "Announcement", color: "bg-red-500" },
  QUESTION: { label: "Question", color: "bg-blue-500" },
};

export default function ForumPage() {
  const { address, isConnected } = useWallet();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sort, setSort] = useState<"bumped" | "created" | "posts">("bumped");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchDiscussions();
  }, [selectedCategory, selectedType, sort, page]);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/forum/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }

  async function fetchDiscussions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort,
      });
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedType) params.set("type", selectedType);

      const res = await fetch(`/api/forum/discussions?${params}`);
      const data = await res.json();
      setDiscussions(data.discussions || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error("Failed to fetch discussions:", error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold text-white">
                ALKANES
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/docs"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Docs
                </Link>
                <Link
                  href="/governance"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Governance
                </Link>
                <Link href="/forum" className="text-white font-medium">
                  Forum
                </Link>
              </nav>
            </div>
            {isConnected && address && (
              <div className="text-sm text-slate-400">
                {formatAddress(address)}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="glass rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">Categories</h2>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "text-xs",
                    !selectedCategory ? "text-alkane-400" : "text-slate-400 hover:text-white"
                  )}
                >
                  All
                </button>
              </div>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors",
                      selectedCategory === cat.id
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className="text-xs opacity-60">{cat._count.discussions}</span>
                  </button>
                ))}
              </div>

              <hr className="border-white/10" />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400">Type</h3>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(TYPE_BADGES).map(([type, { label, color }]) => (
                    <button
                      key={type}
                      onClick={() =>
                        setSelectedType(selectedType === type ? null : type)
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-xs transition-colors",
                        selectedType === type
                          ? `${color} text-white`
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-white/10" />

              {isConnected ? (
                <Link
                  href="/forum/new"
                  className="btn-primary w-full text-center block py-2 rounded-lg"
                >
                  New Discussion
                </Link>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Connect wallet to post
                </p>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sort controls */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">Discussions</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Sort:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                >
                  <option value="bumped">Latest Activity</option>
                  <option value="created">Newest</option>
                  <option value="posts">Most Replies</option>
                </select>
              </div>
            </div>

            {/* Discussion list */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="glass rounded-xl p-4 animate-pulse"
                  >
                    <div className="h-5 bg-slate-700 rounded w-2/3 mb-2" />
                    <div className="h-4 bg-slate-700 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : discussions.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-slate-400">No discussions found</p>
                {isConnected && (
                  <Link
                    href="/forum/new"
                    className="text-alkane-400 hover:text-alkane-300 mt-2 inline-block"
                  >
                    Start the first discussion
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {discussions.map((discussion) => (
                  <Link
                    key={discussion.id}
                    href={`/forum/${discussion.slug}`}
                    className="glass rounded-xl p-4 block hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {discussion.isPinned && (
                            <span className="text-amber-400 text-xs">
                              <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477l-3.763 1.105 1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                              </svg>
                            </span>
                          )}
                          {discussion.isLocked && (
                            <span className="text-slate-500 text-xs">
                              <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-xs text-white",
                              TYPE_BADGES[discussion.type].color
                            )}
                          >
                            {TYPE_BADGES[discussion.type].label}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${discussion.category.color}20`,
                              color: discussion.category.color,
                            }}
                          >
                            {discussion.category.name}
                          </span>
                        </div>
                        <h3 className="text-white font-medium group-hover:text-alkane-400 transition-colors truncate">
                          {discussion.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{formatAddress(discussion.author)}</span>
                          <span>&middot;</span>
                          <span>{formatRelativeTime(discussion.bumpedAt)}</span>
                          {discussion.proposal && (
                            <>
                              <span>&middot;</span>
                              <span className="text-emerald-400">
                                {discussion.proposal.state}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="text-center">
                          <div className="text-white font-medium">
                            {discussion.postsCount - 1}
                          </div>
                          <div>replies</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-medium">
                            {discussion.viewsCount}
                          </div>
                          <div>views</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-50 hover:bg-slate-700"
                >
                  Previous
                </button>
                <span className="text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-50 hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
