/**
 * The stored-XSS fix.
 *
 * `marked` 14.1.4 copies raw HTML through verbatim and happily emits
 * `javascript:` hrefs. Forum posts were rendered with `marked.parse` and then
 * injected with `dangerouslySetInnerHTML`, so any unauthenticated caller could
 * store script that ran in every reader's browser.
 *
 * The negatives below are the payloads that worked before the fix; each one is
 * asserted twice — once that the dangerous construct is gone, and once that
 * the result passes the render-side allowlist, since that is the gate the
 * component actually applies.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown, safeCookedHtml } from "@/lib/markdown";
import { isSafeRenderedHtml } from "@/lib/safe-html";

const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg/onload=alert(1)>",
  '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
  '<body onload="alert(1)">',
  '<a href="javascript:alert(1)">click</a>',
  "[click](javascript:alert(1))",
  "[click](  JaVaScRiPt:alert(1))",
  "[click](java\tscript:alert(1))",
  "![x](javascript:alert(1))",
  "[click](vbscript:alert(1))",
  "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
  '<div style="background:url(javascript:alert(1))">x</div>',
  "<!--[if IE]><script>alert(1)</script><![endif]-->",
  '<object data="javascript:alert(1)"></object>',
  '<form action="javascript:alert(1)"><input formaction="javascript:alert(1)"></form>',
  "<math><mtext><script>alert(1)</script></mtext></math>",
  '<a href="&#106;avascript:alert(1)">entity</a>',
  "<base href=\"javascript:\">",
  "<style>@import 'javascript:alert(1)'</style>",
];

/**
 * The markup a browser would act on: everything between `<` and `>`.
 * Escaped text such as `&lt;script&gt;` is inert and deliberately not here —
 * asserting against the whole string would fail on payloads that are safe
 * precisely because they were escaped.
 */
function liveMarkup(html: string): string {
  return (html.match(/<[^>]*>/g) ?? []).join("\n");
}

describe("renderMarkdown", () => {
  describe("negative — every stored-XSS payload is neutralised", () => {
    for (const payload of PAYLOADS) {
      it(`neutralises ${JSON.stringify(payload).slice(0, 60)}`, () => {
        const html = renderMarkdown(payload);
        const markup = liveMarkup(html);

        expect(markup).not.toMatch(/<\s*\/?\s*(script|iframe|object|embed|style|base|form|input|link|meta|svg|math)\b/i);
        expect(markup).not.toMatch(/\son\w+\s*=/i);
        expect(markup).not.toMatch(/javascript:/i);
        expect(markup).not.toMatch(/vbscript:/i);
        expect(markup).not.toMatch(/\sstyle\s*=/i);
        expect(markup).not.toMatch(/data:/i);
        expect(html).not.toContain("<!");

        // And the gate the render site applies must accept it.
        expect(isSafeRenderedHtml(html)).toBe(true);
      });
    }

    it("escapes raw HTML rather than emitting it", () => {
      expect(renderMarkdown("<b>bold</b>")).toContain("&lt;b&gt;");
    });

    it("keeps the label but drops the link for an unsafe scheme", () => {
      const html = renderMarkdown("[click me](javascript:alert(1))");
      expect(html).toContain("click me");
      expect(html).not.toContain("<a ");
    });

    it("does not let a fenced-code language become an attribute", () => {
      const html = renderMarkdown('```js" onmouseover="alert(1)\nx\n```');
      expect(html).not.toMatch(/\son\w+\s*=/i);
      expect(isSafeRenderedHtml(html)).toBe(true);
    });

    it("never throws, whatever it is given", () => {
      for (const input of ["", "#".repeat(5000), "\u0000\u001b", "![](", "]("]) {
        expect(() => renderMarkdown(input)).not.toThrow();
      }
      expect(renderMarkdown(undefined)).toBe("");
      expect(renderMarkdown(null)).toBe("");
      expect(renderMarkdown(42)).toBe("");
    });
  });

  describe("positive control — legitimate markdown still renders", () => {
    it("renders headings, emphasis and code", () => {
      const html = renderMarkdown("# Title\n\nSome **bold** and `code`.");
      expect(html).toContain("<h1>Title</h1>");
      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<code>code</code>");
    });

    it("renders lists and blockquotes", () => {
      const html = renderMarkdown("- one\n- two\n\n> quoted");
      expect(html).toContain("<ul>");
      expect(html).toContain("<li>one</li>");
      expect(html).toContain("<blockquote>");
    });

    it("renders fenced code with a language class", () => {
      const html = renderMarkdown("```rust\nfn main() {}\n```");
      expect(html).toContain('<code class="language-rust">');
      expect(html).toContain("fn main() {}");
    });

    it("renders http and https links, with rel and target", () => {
      const html = renderMarkdown("[docs](https://alkanes.build/docs)");
      expect(html).toContain('href="https://alkanes.build/docs"');
      expect(html).toContain('rel="nofollow noopener noreferrer"');
      expect(html).toContain('target="_blank"');
    });

    it("renders relative links without rel or target", () => {
      const html = renderMarkdown("[quickstart](/docs/quickstart)");
      expect(html).toContain('href="/docs/quickstart"');
      expect(html).not.toContain("target=");
    });

    it("renders mailto links", () => {
      expect(renderMarkdown("[mail](mailto:x@example.com)")).toContain(
        'href="mailto:x@example.com"'
      );
    });

    it("renders images with a safe source", () => {
      const html = renderMarkdown("![diagram](https://example.com/d.png)");
      expect(html).toContain('<img src="https://example.com/d.png"');
      expect(html).toContain('alt="diagram"');
    });

    it("renders GFM tables", () => {
      const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
      expect(html).toContain("<table>");
      expect(html).toContain("<td>1</td>");
      expect(isSafeRenderedHtml(html)).toBe(true);
    });

    it("leaves ordinary prose alone", () => {
      expect(renderMarkdown("A plain sentence.")).toBe(
        "<p>A plain sentence.</p>\n"
      );
    });
  });
});

describe("safeCookedHtml", () => {
  it("re-renders from the markdown source, ignoring poisoned stored HTML", () => {
    const html = safeCookedHtml(
      "Hello **world**",
      '<p>Hello <script>alert(1)</script></p>'
    );

    expect(html).toContain("<strong>world</strong>");
    expect(html).not.toContain("<script");
  });

  it("falls back to stored HTML only when it passes the allowlist", () => {
    expect(safeCookedHtml(null, "<p>fine</p>")).toBe("<p>fine</p>");
    expect(safeCookedHtml(null, "<p><script>alert(1)</script></p>")).toBe("");
    expect(safeCookedHtml(undefined, undefined)).toBe("");
  });
});
