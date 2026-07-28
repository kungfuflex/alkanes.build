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
const LOCALES = Object.keys(CATALOGUES) as (keyof typeof CATALOGUES)[];

// The one line that must never be paraphrased, re-cased, or translated.
const DEFINITIONAL_LINE =
  "Aries is the AI-native front door for building on Alkanes and utilizing SUBFROST as a developer.";

const TELEGRAM_GROUP_URL = "https://t.me/+DLc96-DPNJRlZTgx";
const KEY_BOT_URL = "https://t.me/AriesKeyBot?start=claim";
const REPO_URL = "https://github.com/Aries-Labs-HQ/alkanes-aries";

// This page is the self-contained explainer: it must never hand the reader off
// to a hosted landing page. The MCP endpoint shares a hostname with one of them,
// so it is allowed as code text only — never as a link target.
const MCP_ENDPOINT = "https://aries.bragi.build/mcp";
const LANDING_NEEDLES = ["aries.bragi.build", "bragi.build/aries"];

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

function catalogueStrings(block: unknown): string[] {
  const out: string[] = [];
  const walk = (node: Record<string, unknown>) => {
    for (const value of Object.values(node)) {
      if (typeof value === "string") out.push(value);
      else if (value && typeof value === "object")
        walk(value as Record<string, unknown>);
    }
  };
  walk(block as Record<string, unknown>);
  return out;
}

describe("AriesPage", () => {
  it("renders the Aries definitional line", () => {
    renderAt("en");

    expect(screen.getByText(DEFINITIONAL_LINE)).toBeDefined();
  });

  it("shows the MCP endpoint and connect snippets with the auth header", () => {
    renderAt("en");

    expect(screen.getByText(MCP_ENDPOINT)).toBeDefined();
    expect(
      screen.getByText(/claude mcp add --transport http aries/)
    ).toBeDefined();
    expect(
      screen.getByText(/--header "Authorization: Bearer YOUR_KEY"/)
    ).toBeDefined();
    expect(screen.getByText(/"mcpServers"/)).toBeDefined();
  });

  it("makes joining the builders group the primary call to action", () => {
    const { container } = renderAt("en");

    const links = hrefs(container);
    expect(links.filter((h) => h === TELEGRAM_GROUP_URL).length).toBeGreaterThan(
      0
    );

    // The group CTA is the first link on the page and carries btn-primary.
    const first = container.querySelector("a") as HTMLAnchorElement;
    expect(first.getAttribute("href")).toBe(TELEGRAM_GROUP_URL);
    expect(first.className).toContain("btn-primary");
  });

  it("presents claiming a key as an ordered flow behind the group", () => {
    const { container } = renderAt("en");

    // Three steps, in order, as a real ordered list.
    const steps = Array.from(container.querySelectorAll("ol > li")).map((li) =>
      (li.textContent ?? "").trim()
    );
    expect(steps).toEqual([
      en.aries.access.step1,
      en.aries.access.step2,
      en.aries.access.step3,
    ]);

    // Step 1 joins the group, step 2 opens the bot and presses Start, step 3
    // says the key arrives in that same chat and needs a username.
    expect(steps[0]).toMatch(/group/i);
    expect(steps[1]).toMatch(/@AriesKeyBot/);
    expect(steps[1]).toMatch(/Start/);
    expect(steps[2]).toMatch(/username/i);

    // Beta keys are stated plainly to be for group members.
    expect(en.aries.access.body).toMatch(/Beta keys/);
    expect(en.aries.access.body).toMatch(/members of the builders group/);

    // The bot is still reachable — as step 2 of the flow, not as a way past it.
    const links = hrefs(container);
    expect(links).toContain(KEY_BOT_URL);
    const botLink = Array.from(container.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === KEY_BOT_URL
    ) as HTMLAnchorElement;
    expect(botLink.className).not.toContain("btn-primary");
  });

  it("never links to a hosted landing page, in any locale", () => {
    for (const locale of LOCALES) {
      const { container, unmount } = renderAt(locale);

      for (const a of Array.from(container.querySelectorAll("a"))) {
        const href = a.getAttribute("href") ?? "";
        for (const needle of LANDING_NEEDLES) {
          expect(href.includes(needle)).toBe(false);
        }
      }

      // The endpoint may still appear as text — but only inside code.
      let endpointSightings = 0;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        if (!LANDING_NEEDLES.some((n) => text.includes(n))) continue;
        endpointSightings++;
        expect(node.parentElement?.closest("code, pre")).toBeTruthy();
      }
      expect(endpointSightings).toBeGreaterThan(0);

      // No catalogue string smuggles a landing page into prose either.
      for (const value of catalogueStrings(CATALOGUES[locale].aries)) {
        for (const needle of LANDING_NEEDLES) {
          expect(value.includes(needle)).toBe(false);
        }
      }

      unmount();
    }
  });

  it("links out only to the group, the bot and the repo", () => {
    const { container } = renderAt("en");

    const external = Array.from(container.querySelectorAll("a")).filter((a) =>
      a.getAttribute("href")?.startsWith("http")
    );
    const allowed = new Set([TELEGRAM_GROUP_URL, KEY_BOT_URL, REPO_URL]);

    for (const a of external) {
      expect(allowed.has(a.getAttribute("href") as string)).toBe(true);
      // Every external link opens safely.
      expect(a.getAttribute("rel")).toContain("noopener");
    }
    for (const url of allowed) {
      expect(hrefs(container)).toContain(url);
    }
  });

  it("explains itself on the page: the loop and the corpus flywheel", () => {
    renderAt("en");

    expect(screen.getByText(en.aries.loop.lead)).toBeDefined();
    expect(screen.getByText(en.aries.loop.knowledgeTitle)).toBeDefined();
    expect(screen.getByText(en.aries.loop.chainDataTitle)).toBeDefined();
    expect(screen.getByText(en.aries.loop.scaffoldsTitle)).toBeDefined();
    // The flywheel: Aries gets smarter with every builder who uses it.
    expect(screen.getByText(en.aries.loop.flywheelTitle)).toBeDefined();
    expect(screen.getByText(/smarter with every builder/)).toBeDefined();
  });

  it("keeps the read-only banner and the Orbitals line", () => {
    renderAt("en");

    expect(
      screen.getByText(/never signs, never broadcasts, and never touches wallets/)
    ).toBeDefined();
    expect(
      screen.getByText(
        "Aries Orbitals — you can buy the art; you can't buy the record."
      )
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
    for (const locale of LOCALES) {
      const { container, unmount } = renderAt(locale);
      const text = container.textContent ?? "";

      // Sanctioned line is verbatim EN everywhere.
      expect(text).toContain(DEFINITIONAL_LINE);
      // SUBFROST is never re-cased.
      expect(text).not.toMatch(/Subfrost|subfrost/);
      // No emojis anywhere on the page.
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      // No exact dates.
      expect(text).not.toMatch(/\b(19|20)\d{2}\b/);
      // Brand names survive translation.
      expect(text).toContain("Alkanes + SUBFROST");
      expect(text).toContain("Aries");
      // "Aries Orbitals" is the only name for them.
      expect(text).toContain("Aries Orbitals");
      // The read-only claim is present in every locale.
      expect(text).toContain(CATALOGUES[locale].aries.loop.readOnlyTitle);

      unmount();
    }
  });

  it("has no user-visible string outside the message catalogue", () => {
    // Rendered under a non-English locale, every leaf prose node must come from
    // that locale's catalogue. Anything left in English is a hardcoded string.
    const { container } = renderAt("zh");

    const catalogue = new Set(
      catalogueStrings(zh.aries).map((s) => s.trim())
    );

    const main = within(container).getByRole("main");
    const prose = Array.from(
      main.querySelectorAll("h1, h2, h3, p, span, li, a")
    ).filter((el) => el.children.length === 0);

    for (const el of prose) {
      const text = (el.textContent ?? "").trim();
      if (!text) continue;
      expect(catalogue.has(text)).toBe(true);
    }

    // Link labels carry an icon child, so check them by text regardless.
    for (const a of Array.from(main.querySelectorAll("a"))) {
      const text = (a.textContent ?? "").trim();
      if (!text) continue;
      expect(catalogue.has(text)).toBe(true);
    }
  });
});
