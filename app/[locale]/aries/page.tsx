"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Database,
  Blocks,
  RefreshCw,
  ShieldCheck,
  Send,
  Terminal,
  SquareMousePointer,
  KeyRound,
} from "lucide-react";

// The MCP endpoint is a product identifier shown inside code, never a link.
const MCP_ENDPOINT = "https://aries.bragi.build/mcp";
const TELEGRAM_GROUP_URL = "https://t.me/+DLc96-DPNJRlZTgx";
const KEY_BOT_URL = "https://t.me/AriesKeyBot?start=claim";
const REPO_URL = "https://github.com/Aries-Labs-HQ/alkanes-aries";

// Warm horn -> cool horn, sampled from the ram mark. Drives the hero lockup and
// the glow behind it, so the brand gradient lives in one place.
const LOCKUP_GRADIENT =
  "linear-gradient(100deg, #e8412b 0%, #ff7a3c 38%, #6cb6ee 70%, #4aa6e8 100%)";
const HERO_GLOW =
  "radial-gradient(60% 60% at 38% 30%, rgba(232, 65, 43, 0.18), transparent 70%), " +
  "radial-gradient(60% 60% at 64% 34%, rgba(74, 166, 232, 0.16), transparent 70%)";

const claudeCodeSnippet = `claude mcp add --transport http aries ${MCP_ENDPOINT} \\
  --header "Authorization: Bearer YOUR_KEY" --scope user`;

const cursorSnippet = `{
  "mcpServers": {
    "aries": {
      "url": "${MCP_ENDPOINT}",
      "headers": { "Authorization": "Bearer YOUR_KEY" }
    }
  }
}`;

export default function AriesPage() {
  const t = useTranslations("aries");

  const badges = [
    t("hero.badgeHosted"),
    t("hero.badgeZeroSetup"),
    t("hero.badgeReadOnly"),
    t("hero.badgeFree"),
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 w-full">
      {/* Hero — ported from the original bragi.build/aries lockup: ram mark over a
          warm-to-cool glow, wordmark, then the Alkanes + SUBFROST lockup. The
          lockup is live text, not baked art, so casing and locale stay ours. */}
      <section className="relative text-center mb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 h-[520px] blur-[8px]"
          style={{ background: HERO_GLOW }}
        />
        <div className="relative">
          <Image
            src="/images/aries/aries-mark.png"
            alt={t("hero.markAlt")}
            width={617}
            height={480}
            priority
            className="mx-auto h-auto w-[min(300px,64vw)] drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          />
          <h1 className="mt-8 text-4xl md:text-5xl font-bold tracking-tight text-[color:var(--sf-text)]">
            {t("hero.wordmark")}
          </h1>
          <p className="mt-3 text-lg md:text-xl font-semibold tracking-wide">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: LOCKUP_GRADIENT }}
            >
              {t("hero.lockup")}
            </span>
          </p>
          <p className="mt-6 text-xl md:text-2xl text-[color:var(--sf-text)] max-w-3xl mx-auto leading-relaxed">
            {t("hero.definition")}
          </p>
          {/* The group is the front door: keys are claimed after joining it. */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <a
              href={TELEGRAM_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t("hero.joinGroup")}
            </a>
            <a href="#connect" className="btn-secondary inline-flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              {t("hero.connectEditor")}
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[color:var(--sf-outline)] bg-[color:var(--sf-surface)] px-3 py-1.5 font-mono text-xs font-semibold text-[color:var(--sf-muted)]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — the whole explanation lives on this page, not behind a link. */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-[color:var(--sf-text)] mb-2">
          {t("loop.title")}
        </h2>
        <p className="text-[color:var(--sf-muted)] mb-6">{t("loop.lead")}</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <BookOpen className="w-6 h-6 text-[color:var(--sf-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              {t("loop.knowledgeTitle")}
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              {t("loop.knowledgeBody")}
            </p>
          </div>
          <div className="glass-card p-6">
            <Database className="w-6 h-6 text-[color:var(--sf-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              {t("loop.chainDataTitle")}
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              {t("loop.chainDataBody")}
            </p>
          </div>
          <div className="glass-card p-6">
            <Blocks className="w-6 h-6 text-[color:var(--sf-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              {t("loop.scaffoldsTitle")}
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              {t("loop.scaffoldsBody")}
            </p>
          </div>
        </div>
        <div className="glass-card p-6 mt-6 flex items-start gap-4">
          <RefreshCw className="w-6 h-6 text-[color:var(--sf-primary)] shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              {t("loop.flywheelTitle")}
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              {t("loop.flywheelBody")}
            </p>
          </div>
        </div>
        <div className="glass-card p-6 mt-6 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-[color:var(--sf-primary)] shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">
              {t("loop.readOnlyTitle")}
            </h3>
            <p className="text-[color:var(--sf-muted)] leading-relaxed">
              {t("loop.readOnlyBody")}
            </p>
          </div>
        </div>
      </section>

      {/* Get access — group first, then the key. The ordered list is the flow. */}
      <section className="mb-16">
        <div className="glass-card p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--sf-primary)] mb-3">
            {t("access.eyebrow")}
          </p>
          <h2 className="text-2xl font-bold text-[color:var(--sf-text)] mb-3">
            {t("access.title")}
          </h2>
          <p className="text-[color:var(--sf-muted)] max-w-2xl mx-auto mb-6">
            {t("access.body")}
          </p>
          <ol className="list-decimal list-outside text-left max-w-xl mx-auto pl-6 mb-8 space-y-3 text-[color:var(--sf-muted)] marker:font-mono marker:font-semibold marker:text-[color:var(--sf-primary)]">
            <li className="leading-relaxed">{t("access.step1")}</li>
            <li className="leading-relaxed">{t("access.step2")}</li>
            <li className="leading-relaxed">{t("access.step3")}</li>
          </ol>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={TELEGRAM_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t("access.joinCta")}
            </a>
            <a
              href={KEY_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {t("access.botCta")}
            </a>
          </div>
          <p className="text-[color:var(--sf-muted)] text-sm mt-6">
            {t("access.note")}
          </p>
        </div>
      </section>

      {/* Connect */}
      <section id="connect" className="mb-16 scroll-mt-24">
        <h2 className="text-2xl font-bold text-[color:var(--sf-text)] mb-2">
          {t("connect.title")}
        </h2>
        <p className="text-[color:var(--sf-muted)] mb-6">{t("connect.lead")}</p>
        <div className="glass-card p-4 mb-6 overflow-x-auto">
          <span className="block font-mono text-xs uppercase tracking-wider text-[color:var(--sf-muted)] mb-1">
            {t("connect.endpointLabel")}
          </span>
          <code className="font-mono text-sm text-[color:var(--sf-primary)]">
            {MCP_ENDPOINT}
          </code>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card overflow-hidden">
            <div className="card-header flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[color:var(--sf-muted)]" />
              <span className="font-semibold text-[color:var(--sf-text)]">
                {t("connect.claudeCode")}
              </span>
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
                {t("connect.cursor")}{" "}
                <span className="text-[color:var(--sf-muted)] font-normal">
                  {t("connect.cursorFile")}
                </span>
              </span>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="font-mono text-sm text-[color:var(--sf-text)] whitespace-pre">
                {cursorSnippet}
              </code>
            </pre>
          </div>
        </div>
        <p className="text-[color:var(--sf-muted)] text-sm mt-4">
          {t("connect.keyNote")}
        </p>
      </section>

      {/* Close — source, then the Orbitals tease. */}
      <section className="text-center space-y-3">
        <p className="text-[color:var(--sf-muted)] text-sm">
          <span>{t("repo.line")}</span>{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--sf-primary)] underline underline-offset-4"
          >
            {t("repo.cta")}
          </a>
        </p>
        <p className="text-[color:var(--sf-muted)]">{t("orbitals.line")}</p>
      </section>
    </main>
  );
}
