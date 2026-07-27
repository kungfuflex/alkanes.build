import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AriesPage from "@/app/[locale]/aries/page";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import ms from "@/messages/ms.json";
import vi from "@/messages/vi.json";
import ko from "@/messages/ko.json";

const CATALOGUES = { en, zh, ms, vi, ko } as const;

// The one line that must never be paraphrased, re-cased, or translated.
const DEFINITIONAL_LINE =
  "Aries is the AI-native front door for building on Alkanes and utilizing SUBFROST as a developer.";

const KEY_BOT_URL = "https://t.me/AriesKeyBot?start=claim";
const TELEGRAM_GROUP_URL = "https://t.me/+DLc96-DPNJRlZTgx";
const HOSTED_SITE_URL = "https://aries.bragi.build";
const REPO_URL = "https://github.com/Aries-Labs-HQ/alkanes-aries";

function renderAt(locale: keyof typeof CATALOGUES) {
  const { container, unmount } = render(
    <NextIntlClientProvider locale={locale} messages={CATALOGUES[locale]}>
      <AriesPage />
    </NextIntlClientProvider>
  );
  return { container, unmount };
}

function hrefs(container: HTMLElement) {
  return Array.from(container.querySelectorAll("a")).map((a) =>
    a.getAttribute("href")
  );
}

describe("AriesPage", () => {
  it("renders the Aries definitional line", () => {
    renderAt("en");

    expect(screen.getByText(DEFINITIONAL_LINE)).toBeDefined();
  });

  it("shows the MCP endpoint and connect snippets with the auth header", () => {
    renderAt("en");

    expect(screen.getByText("https://aries.bragi.build/mcp")).toBeDefined();
    expect(
      screen.getByText(/claude mcp add --transport http aries/)
    ).toBeDefined();
    expect(
      screen.getByText(/--header "Authorization: Bearer YOUR_KEY"/)
    ).toBeDefined();
    expect(screen.getByText(/"mcpServers"/)).toBeDefined();
  });

  it("makes the one-tap key claim the primary call to action", () => {
    const { container } = renderAt("en");

    const links = hrefs(container);
    expect(links.filter((h) => h === KEY_BOT_URL).length).toBeGreaterThan(0);

    // The claim CTA is the first link on the page and carries btn-primary.
    const first = container.querySelector("a") as HTMLAnchorElement;
    expect(first.getAttribute("href")).toBe(KEY_BOT_URL);
    expect(first.className).toContain("btn-primary");
  });

  it("links out to the group, the hosted funnel and the repo", () => {
    const { container } = renderAt("en");

    const links = hrefs(container);
    for (const url of [TELEGRAM_GROUP_URL, HOSTED_SITE_URL, REPO_URL]) {
      expect(links).toContain(url);
    }

    // Every external link opens safely.
    const external = Array.from(container.querySelectorAll("a")).filter((a) =>
      a.getAttribute("href")?.startsWith("http")
    );
    for (const a of external) {
      expect(a.getAttribute("rel")).toContain("noopener");
    }
  });

  it("keeps the read-only banner and the Orbitals line", () => {
    renderAt("en");

    expect(
      screen.getByText(/never signs, never broadcasts, and never touches wallets/)
    ).toBeDefined();
    expect(
      screen.getByText(/Aries Orbitals — the pass is earned, never sold/)
    ).toBeDefined();
  });

  it("renders the hero lockup as live text, not baked art", () => {
    const { container } = renderAt("en");

    // "Alkanes + SUBFROST" must be selectable DOM text so casing and locale
    // stay controllable — a raster would hide it from the accessibility tree.
    expect(screen.getByText("Alkanes + SUBFROST")).toBeDefined();

    const mark = container.querySelector("img") as HTMLImageElement;
    expect(mark).toBeTruthy();
    expect(mark.getAttribute("alt")).toBe(en.aries.hero.markAlt);
  });

  it("switches language when the locale changes", () => {
    const { container: enTree, unmount } = renderAt("en");
    const enText = enTree.textContent ?? "";
    unmount();

    const { container: zhTree } = renderAt("zh");
    const zhText = zhTree.textContent ?? "";

    expect(zhText).not.toBe(enText);
    expect(zhText).toContain(zh.aries.loop.title);
    expect(zhText).not.toContain(en.aries.loop.title);
    expect(zhText).not.toContain(en.aries.access.body);
  });

  it("obeys the copy laws in every locale", () => {
    for (const locale of Object.keys(CATALOGUES) as (keyof typeof CATALOGUES)[]) {
      const { container, unmount } = renderAt(locale);
      const text = container.textContent ?? "";

      // Sanctioned line is verbatim EN everywhere.
      expect(text).toContain(DEFINITIONAL_LINE);
      // SUBFROST is never re-cased.
      expect(text).not.toMatch(/Subfrost|subfrost/);
      // No emojis anywhere on the page.
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      // Brand names survive translation.
      expect(text).toContain("Alkanes + SUBFROST");
      expect(text).toContain("Aries");
      // The read-only claim is present in every locale.
      expect(text).toContain(CATALOGUES[locale].aries.loop.readOnlyTitle);

      unmount();
    }
  });

  it("has no user-visible string outside the message catalogue", () => {
    // Rendered under a non-English locale, every leaf prose node must come from
    // that locale's catalogue. Anything left in English is a hardcoded string.
    const { container } = renderAt("zh");

    const catalogue = new Set<string>();
    const walk = (node: Record<string, unknown>) => {
      for (const value of Object.values(node)) {
        if (typeof value === "string") catalogue.add(value.trim());
        else if (value && typeof value === "object")
          walk(value as Record<string, unknown>);
      }
    };
    walk(zh.aries as unknown as Record<string, unknown>);

    const main = within(container).getByRole("main");
    const prose = Array.from(
      main.querySelectorAll("h1, h2, h3, p, span, a")
    ).filter((el) => el.children.length === 0);

    for (const el of prose) {
      const text = (el.textContent ?? "").trim();
      if (!text) continue;
      expect(catalogue.has(text)).toBe(true);
    }
  });
});
