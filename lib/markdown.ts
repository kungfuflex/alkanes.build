/**
 * The one place user-supplied markdown becomes HTML.
 *
 * `marked` does not sanitise. Its `sanitize` option was removed in v7, and on
 * the version this repo pins (14.1.4) raw HTML in the source is copied through
 * verbatim — `<script>alert(1)</script>` in, `<script>alert(1)</script>` out —
 * and `[x](javascript:alert(1))` becomes a live `javascript:` href. Since the
 * rendered result is injected with `dangerouslySetInnerHTML`, calling
 * `marked.parse` directly on user input is a stored-XSS sink.
 *
 * This module closes it with two independent layers:
 *
 * 1. GENERATE SAFE HTML. Raw HTML tokens are escaped rather than emitted, and
 *    every URL the renderer emits is checked against a scheme allowlist. The
 *    output is therefore built entirely by marked's own renderer from escaped
 *    text — attacker-controlled markup never reaches the output as markup.
 *
 * 2. ASSERT, THEN FAIL CLOSED. The result is checked against
 *    `isSafeRenderedHtml`. If it does not fit the allowlisted shape — which it
 *    should not be able to — the markdown is discarded and the source is
 *    emitted as escaped plain text instead. A future change to marked cannot
 *    silently reopen the sink.
 */

import {
  Marked,
  type Renderer,
  type RendererObject,
  type TokenizerObject,
  type Tokens,
} from "marked";
import { escapeHtml, isSafeRenderedHtml, isSafeUrl } from "@/lib/safe-html";

/** Return the URL if it is safe to emit, otherwise null. */
function safeHref(href: string | null | undefined): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (trimmed === "") return null;
  return isSafeUrl(trimmed) ? trimmed : null;
}

/** A fenced-code language becomes a class name, so restrict it hard. */
function safeLanguage(lang: string | null | undefined): string | null {
  if (typeof lang !== "string") return null;
  const first = lang.trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z0-9_+-]{1,32}$/.test(first) ? first : null;
}

/** Optional `title` attribute, escaped. */
function titleAttribute(title: string | null | undefined): string {
  return title ? ` title="${escapeHtml(String(title))}"` : "";
}

const safeRenderer: RendererObject = {
  /**
   * Raw HTML — block and inline alike. Escaped, never emitted. Escaping
   * rather than dropping means a post that contains `<b>` still shows the
   * author what they typed instead of silently losing it.
   */
  html(token: Tokens.HTML | Tokens.Tag): string {
    return escapeHtml(token.raw ?? token.text ?? "");
  },

  link(this: Renderer, token: Tokens.Link): string {
    const href = safeHref(token.href);
    const text = token.tokens
      ? this.parser.parseInline(token.tokens)
      : escapeHtml(token.text ?? "");

    // Unsafe scheme: keep the label, drop the link.
    if (href === null) return text;

    const external = /^https?:/i.test(href);
    const rel = external ? ' rel="nofollow noopener noreferrer"' : "";
    const target = external ? ' target="_blank"' : "";
    return `<a href="${escapeHtml(href)}"${titleAttribute(token.title)}${rel}${target}>${text}</a>`;
  },

  image(token: Tokens.Image): string {
    const src = safeHref(token.href);
    const alt = escapeHtml(String(token.text ?? ""));

    // Unsafe scheme: render the alt text, never the element.
    if (src === null) return alt;

    return `<img src="${escapeHtml(src)}" alt="${alt}"${titleAttribute(token.title)}>`;
  },

  code(token: Tokens.Code): string {
    const lang = safeLanguage(token.lang);
    const cls = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${cls}>${escapeHtml(String(token.text ?? ""))}\n</code></pre>\n`;
  },

  codespan(token: Tokens.Codespan): string {
    return `<code>${escapeHtml(String(token.text ?? ""))}</code>`;
  },
};

/**
 * Raw HTML never becomes a token.
 *
 * Escaping in the renderer is not enough on its own. marked's inline `tag`
 * tokenizer sets `lexer.state.inRawBlock` when it sees an opening `<code>`,
 * `<pre>`, `<kbd>` or `<script>`, and while that flag is set the inline TEXT
 * tokenizer stops escaping and returns the raw source slice. That text is
 * emitted by the default `text` renderer, which never passed through the
 * escaping override — so a post beginning `foo <code> ` could smuggle live
 * markup through as ordinary text.
 *
 * Refusing to tokenise raw HTML at all removes the flag's only writer. Every
 * `<` in the source now falls through to the text tokenizer with escaping
 * still on, which is the behaviour the renderer override was reaching for.
 */
const safeTokenizer: TokenizerObject = {
  html() {
    return false;
  },
  tag() {
    return false;
  },
};

const safeMarked = new Marked({ gfm: true, breaks: true });
safeMarked.use({ renderer: safeRenderer, tokenizer: safeTokenizer });

/** Escaped plain text, used when the safe path cannot be trusted. */
function asPlainText(markdown: string): string {
  return `<p>${escapeHtml(markdown).replace(/\r?\n/g, "<br>")}</p>`;
}

/**
 * Render user-supplied markdown to HTML that is safe to inject.
 *
 * Never throws: any failure degrades to escaped plain text.
 */
export function renderMarkdown(markdown: unknown): string {
  if (typeof markdown !== "string" || markdown === "") return "";

  let html: string;
  try {
    html = safeMarked.parse(markdown, { async: false }) as string;
  } catch {
    return asPlainText(markdown);
  }

  // Layer 2: the generator is not trusted to have got it right.
  if (!isSafeRenderedHtml(html)) {
    return asPlainText(markdown);
  }

  return html;
}

/**
 * Return HTML that is safe to inject for a stored post.
 *
 * Rows written before `renderMarkdown` existed hold whatever `marked` produced
 * at the time, including live markup. Prefer re-rendering from the markdown
 * source; fall back to the stored HTML only when it passes the allowlist, and
 * to escaped plain text otherwise.
 */
export function safeCookedHtml(
  raw: string | null | undefined,
  cooked: string | null | undefined
): string {
  if (typeof raw === "string" && raw !== "") return renderMarkdown(raw);
  if (typeof cooked === "string" && isSafeRenderedHtml(cooked)) return cooked;
  return "";
}
