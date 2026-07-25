"use client";

import { BookOpen, Database, Blocks, ShieldCheck, Send, Terminal, SquareMousePointer } from "lucide-react";

const MCP_ENDPOINT = "https://aries.bragi.build/mcp";
const TELEGRAM_URL = "https://t.me/+DLc96-DPNJRlZTgx";

const claudeCodeSnippet = `claude mcp add --transport http aries ${MCP_ENDPOINT}`;

const cursorSnippet = `{
  "mcpServers": {
    "aries": {
      "url": "${MCP_ENDPOINT}"
    }
  }
}`;

export default function AriesPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 w-full">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--sf-text)] mb-6">
          Aries
        </h1>
        <p className="text-xl md:text-2xl text-[color:var(--sf-text)] max-w-3xl mx-auto leading-relaxed">
          Aries is the AI-native front door for building on Alkanes and
          utilizing SUBFROST as a developer.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Get early access
          </a>
          <a href="#connect" className="btn-secondary inline-flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Connect your editor
          </a>
        </div>
      </section>

      {/* What Aries is */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-[color:var(--sf-text)] mb-6">
          One loop: knowledge, chain data, scaffolds
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <BookOpen className="w-6 h-6 text-[color:var(--sf-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              Knowledge
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              Alkanes and SUBFROST documentation, patterns, and hard-won
              gotchas, served directly inside your coding agent — so it stops
              guessing and starts answering from the ecosystem&apos;s working
              knowledge.
            </p>
          </div>
          <div className="glass-card p-6">
            <Database className="w-6 h-6 text-[color:var(--sf-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              Chain data
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              Live reads against real Alkanes state: tokens, pools, contract
              metadata, simulations. Your agent checks what is actually
              on-chain instead of hallucinating it.
            </p>
          </div>
          <div className="glass-card p-6">
            <Blocks className="w-6 h-6 text-[color:var(--sf-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              Scaffolds
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              Working starting points for contracts and integrations, generated
              from patterns that are known to build. What developers learn
              feeds back into Aries, and the loop compounds.
            </p>
          </div>
        </div>
        <div className="glass-card p-6 mt-6 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-[color:var(--sf-primary)] shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              Read-only by design, free for every developer
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              Aries never signs, never broadcasts, and never touches wallets or
              keys. It emits docs, live chain reads, and scaffolds for you to
              run locally — and it is free for every developer building on
              Alkanes.
            </p>
          </div>
        </div>
      </section>

      {/* Connect */}
      <section id="connect" className="mb-16 scroll-mt-24">
        <h2 className="text-2xl font-bold text-[color:var(--sf-text)] mb-2">
          Connect
        </h2>
        <p className="text-[color:var(--sf-muted)] mb-6">
          Aries speaks MCP. Point any MCP-compatible client at the endpoint:
        </p>
        <div className="glass-card p-4 mb-6 overflow-x-auto">
          <code className="font-mono text-sm text-[color:var(--sf-primary)]">
            {MCP_ENDPOINT}
          </code>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card overflow-hidden">
            <div className="card-header flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[color:var(--sf-muted)]" />
              <span className="font-semibold text-[color:var(--sf-text)]">Claude Code</span>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="font-mono text-sm text-[color:var(--sf-text)] whitespace-pre">
                {claudeCodeSnippet}
              </code>
            </pre>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="card-header flex items-center gap-2">
              <SquareMousePointer className="w-4 h-4 text-[color:var(--sf-muted)]" />
              <span className="font-semibold text-[color:var(--sf-text)]">
                Cursor <span className="text-[color:var(--sf-muted)] font-normal">(.cursor/mcp.json)</span>
              </span>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="font-mono text-sm text-[color:var(--sf-text)] whitespace-pre">
                {cursorSnippet}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Early access */}
      <section className="mb-16">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold text-[color:var(--sf-text)] mb-3">
            Early access
          </h2>
          <p className="text-[color:var(--sf-muted)] max-w-2xl mx-auto mb-6">
            Aries is rolling out through the early-access group. Join to get
            connected and start building.
          </p>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Join on Telegram
          </a>
        </div>
      </section>

      {/* Orbitals tease */}
      <section>
        <p className="text-center text-[color:var(--sf-muted)]">
          Aries Orbitals — you can buy the art; you can&apos;t buy the record.
        </p>
      </section>
    </main>
  );
}
