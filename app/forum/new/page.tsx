"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  isReadOnly: boolean;
}

export default function NewDiscussionPage() {
  const router = useRouter();
  const { address, isConnected, signMessage } = useWallet();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<"GENERAL" | "QUESTION">("GENERAL");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/forum/categories");
      const data = await res.json();
      // Filter out read-only categories
      const writeable = (data.categories || []).filter(
        (c: Category) => !c.isReadOnly
      );
      setCategories(writeable);
      if (writeable.length > 0) {
        setCategoryId(writeable[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!title.trim() || !content.trim() || !categoryId) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // TODO: Sign the content with BIP-322
      // const signature = await signMessage(JSON.stringify({ title, content }));

      const res = await fetch("/api/forum/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          categoryId,
          author: address,
          type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/forum/${data.discussion.slug}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create discussion");
      }
    } catch (error) {
      console.error("Failed to create discussion:", error);
      alert("Failed to create discussion");
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Wallet Required
          </h1>
          <p className="text-slate-400 mb-4">
            Please connect your wallet to create a discussion
          </p>
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/forum"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-white">
              New Discussion
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your discussion about?"
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-alkane-500"
              required
            />
          </div>

          {/* Category and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Category <span className="text-red-400">*</span>
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-alkane-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-alkane-500"
              >
                <option value="GENERAL">Discussion</option>
                <option value="QUESTION">Question</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your discussion content... (Markdown supported)"
              className="w-full h-64 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-alkane-500"
              required
            />
            <p className="mt-2 text-xs text-slate-500">
              Supports Markdown formatting. Mention users with @address
            </p>
          </div>

          {/* Preview */}
          {content && (
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">
                Preview
              </h3>
              <div className="prose prose-invert prose-slate max-w-none">
                {/* Simple markdown preview - in production would use marked */}
                <div className="whitespace-pre-wrap text-slate-300">
                  {content}
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <Link
              href="/forum"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="btn-primary px-8 py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Discussion"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
