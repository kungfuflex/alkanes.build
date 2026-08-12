/**
 * Regression: the quoted-`>` tag-smuggling bypass.
 *
 * The first cut of the XSS fix had two layers, and one payload defeated both.
 *
 * Layer 1 escaped raw HTML in the RENDERER. But marked's inline `tag` tokenizer
 * sets `lexer.state.inRawBlock` the moment it sees an opening `<code>`, `<pre>`,
 * `<kbd>` or `<script>`, and while that flag is set the inline TEXT tokenizer
 * stops escaping and hands the raw source through to the default `text`
 * renderer, which the fix never overrode. So `foo <code> <img ...>` emitted live
 * markup.
 *
 * Layer 2 asserted the output against an allowlist, but scanned tags with
 * `/<[^>]*>?/g` — a regex that ends a tag at the first `>`, including one inside
 * a quoted attribute value. Browsers do not: they stay in attribute-value state
 * until the quote closes. So `<img/src="alt>x" onerror=alert(1)>` was inspected
 * only as far as `<img/src="alt>`, and the `onerror` was never looked at.
 *
 * `<img/src=...` (no space before the attribute) is also what kept marked's own
 * `tag` rule from matching, which is why the payload stayed "text" in the first
 * place.
 *
 * Both layers are fixed. These tests hold them shut, and they use a real HTML
 * parser rather than a regex — the mismatch between "what our regex thinks a tag
 * is" and "what a browser thinks a tag is" was the entire bug.
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { renderMarkdown } from "@/lib/markdown";
import { isSafeRenderedHtml } from "@/lib/safe-html";

/** Everything a browser would treat as scriptable in this fragment. */
function scriptable(html: string): string[] {
  const { window } = new JSDOM(`<body>${html}</body>`);
  const hits: string[] = [];
  const forbiddenTags = [
    "script", "svg", "iframe", "object", "embed",
    "base", "form", "math", "style", "link", "meta",
  ];

  for (const el of Array.from(window.document.body.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase();
    if (forbiddenTags.includes(tag)) hits.push(`<${tag}>`);

    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) hits.push(`${tag}[${attr.name}]`);
      if (
        /^(href|src|action|formaction|xlink:href)$/i.test(attr.name) &&
        /^\s*(javascript|data|vbscript):/i.test(attr.value)
      ) {
        hits.push(`${tag}[${attr.name}=${attr.value.slice(0, 20)}]`);
      }
    }
  }
  return hits;
}

/** Payloads that reached a live event handler before the fix. */
const SMUGGLED = [
  'Nice post <code> <img/src="alt>x" onerror="alert(1)">',
  'hello <code> <a/href="alt>y" onclick="alert(2)">click</a>',
  'x <pre> <img/class="a>b" onerror=alert(1)>',
  'x <kbd> <p/title="a>b" onmouseover=alert(1)>hi',
  'x <script> <img/alt="a>b" onerror=alert(1)>',
  'z <code> <a/href="x>y" onfocus=alert(1) autofocus>t</a>',
  'q <code> <img/rel="a>b" onerror=alert(1)>',
  'w <code> <img/start="a>b" onerror=alert(1)>',
];

describe("stored XSS — quoted-'>' tag smuggling", () => {
  describe("negative — nothing scriptable survives rendering", () => {
    for (const payload of SMUGGLED) {
      it(`neutralises ${JSON.stringify(payload).slice(0, 60)}`, () => {
        const html = renderMarkdown(payload);
        expect(scriptable(html)).toEqual([]);
        // And the render-side gate agrees, so it is not merely failing closed.
        expect(isSafeRenderedHtml(html)).toBe(true);
      });
    }

    it("escapes raw HTML even after an inline <code> opens a raw block", () => {
      const html = renderMarkdown('a <code> <b>bold</b>');
      expect(html).not.toContain("<b>");
      expect(html).toContain("&lt;b&gt;");
    });

    it("does not let a raw block persist across the whole document", () => {
      const html = renderMarkdown('<code>\n\nlater <img src=x onerror=alert(1)>');
      expect(scriptable(html)).toEqual([]);
    });
  });

  describe("layer 2 alone — a poisoned stored row is rejected", () => {
    const stored = [
      '<img src="alt>b" onerror=alert(1)>',
      '<a href="alt>x" target=_blank onclick=alert(1)>hi</a>',
      '<p class="alt>x" onmouseover=alert(1)>hover</p>',
      '<img src="a>b" onerror="fetch(`//x`)">',
      "<img src='a>b' onerror=alert(1)>",
    ];

    for (const html of stored) {
      it(`rejects ${html.slice(0, 52)}`, () => {
        // Precondition: a browser really would run this.
        expect(scriptable(html).length).toBeGreaterThan(0);
        expect(isSafeRenderedHtml(html)).toBe(false);
      });
    }

    it("rejects an unbalanced quote rather than guessing where the tag ends", () => {
      expect(isSafeRenderedHtml('<img src="unclosed onerror=alert(1)>')).toBe(false);
      expect(isSafeRenderedHtml("<p class='x>y")).toBe(false);
    });

    it("rejects a bogus comment opened with </", () => {
      expect(isSafeRenderedHtml("</ img>")).toBe(false);
      expect(isSafeRenderedHtml("</1>")).toBe(false);
    });
  });

  describe("positive controls — the allowlist still accepts real output", () => {
    it("accepts markup renderMarkdown legitimately produces", () => {
      for (const source of [
        "# Heading\n\nSome **bold** and `code`.",
        "[link](https://example.com)",
        "![img](https://example.com/a.png)",
        "- a\n- b\n\n> quote",
        "```js\nconst a = 1;\n```",
        "| a | b |\n|---|---|\n| 1 | 2 |",
        "mail me at [x](mailto:a@b.c)",
        "[relative](/docs/quickstart)",
      ]) {
        const html = renderMarkdown(source);
        expect(isSafeRenderedHtml(html), source).toBe(true);
        expect(scriptable(html), source).toEqual([]);
      }
    });

    it("keeps a '>' inside a legitimate quoted attribute value", () => {
      // A title carrying a '>' is ordinary content, not an attack.
      expect(isSafeRenderedHtml('<a href="https://x.com" title="a > b">t</a>')).toBe(true);
      expect(isSafeRenderedHtml('<p title="5 > 3">ok</p>')).toBe(true);
    });

    it("still treats a bare '<' in prose as text", () => {
      const html = renderMarkdown("ordinary prose with a < b and 5 > 3");
      expect(isSafeRenderedHtml(html)).toBe(true);
      const { window } = new JSDOM(`<body>${html}</body>`);
      expect(window.document.body.textContent).toContain("a < b");
    });

    it("renders inline code spans and fenced code unchanged", () => {
      expect(renderMarkdown("`a < b`")).toContain("<code>");
      expect(renderMarkdown("```\na < b\n```")).toContain("<pre><code>");
    });
  });
});
