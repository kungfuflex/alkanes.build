/**
 * Fail-closed guard for rendered forum HTML.
 *
 * This is NOT a sanitiser. It never tries to clean attacker input — it only
 * answers one question: "is this string within the small, known set of HTML
 * that `lib/markdown.ts` is allowed to produce?" Anything it is not certain
 * about, it rejects, and the caller falls back to rendering escaped plain
 * text. Being wrong therefore costs formatting, never safety.
 *
 * It is used in two places:
 *   - at the sink, as a final assertion on `renderMarkdown` output; and
 *   - at the render site, so rows written to the database before markdown was
 *     rendered safely can never reach `dangerouslySetInnerHTML`.
 *
 * Pure string operations only: no DOM, no Node built-ins, so it runs
 * identically on the server and in the browser.
 */

/** Tags `renderMarkdown` may emit. Everything else is rejected. */
export const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "p",
  "br",
  "hr",
  "blockquote",
  "pre",
  "code",
  "span",
  "div",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "mark",
  "sub",
  "sup",
  "small",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "a",
  "img",
]);

/**
 * Attributes `renderMarkdown` may emit. Deliberately excludes every event
 * handler, `style`, and anything that can load or execute code.
 */
export const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "href",
  "src",
  "alt",
  "title",
  "class",
  "start",
  "align",
  "colspan",
  "rowspan",
  "checked",
  "disabled",
  "type",
  // Emitted on external links by lib/markdown.ts.
  "rel",
  "target",
]);

/** URL schemes a link or image may use. */
export const ALLOWED_URL_SCHEMES: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
]);

/**
 * Normalise a URL for scheme checking, then decide whether it is safe.
 *
 * Control characters and whitespace are stripped first: `java\tscript:x` and
 * `java\0script:x` are both treated by browsers as `javascript:x`, so a naive
 * `startsWith` check on the raw string is not enough.
 *
 * A value with no scheme at all (`/docs`, `#anchor`, `img/x.png`) is relative
 * and therefore safe.
 */
export function isSafeUrl(value: string): boolean {
  // The control characters are the point: browsers strip them before
  // resolving a scheme, so `java\tscript:` and `java\0script:` both run.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0020\u007F]/g, "");
  if (cleaned === "") return true;

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
  if (!schemeMatch) return true; // relative — no scheme to abuse

  return ALLOWED_URL_SCHEMES.has(`${schemeMatch[1].toLowerCase()}:`);
}

const TAG_NAME_RE = /^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

type ScannedTag = { name: string; attrRegion: string; end: number };

/**
 * Find where a tag that starts at `start` actually ends.
 *
 * A `>` inside a quoted attribute value does NOT close the tag — the HTML
 * tokenizer stays in attribute-value state until the quote is closed. A scan
 * that stops at the first `>` therefore inspects only a prefix of the tag and
 * never sees the attributes after the smuggled `>`, which is exactly how
 * `<img/src="alt>x" onerror=alert(1)>` slips an event handler past a checker
 * that looks like it is doing the right thing.
 *
 * Quotes are honoured wherever they appear rather than only after `=`. That is
 * deliberately broader than the tokenizer: it can only ever extend the region
 * this function reports, so more of the tag gets validated, never less. An
 * unbalanced quote yields no end at all and the caller rejects the input.
 */
function scanTag(html: string, start: number): ScannedTag | null {
  const nameMatch = TAG_NAME_RE.exec(html.slice(start));
  if (!nameMatch) return null;

  const attrStart = start + nameMatch[0].length;
  let quote: string | null = null;

  for (let i = attrStart; i < html.length; i++) {
    const c = html[i];
    if (quote !== null) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === ">") {
      return {
        name: nameMatch[1].toLowerCase(),
        attrRegion: html.slice(attrStart, i).replace(/\/\s*$/, ""),
        end: i,
      };
    }
  }

  // Ran off the end: unterminated tag, or an unbalanced quote.
  return null;
}

function unquote(raw: string | undefined): string {
  if (!raw) return "";
  const first = raw[0];
  if ((first === '"' || first === "'") && raw.endsWith(first)) {
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * Decode the handful of HTML entities a browser would resolve inside an
 * attribute value, so `&#106;avascript:` cannot slip past the scheme check.
 * Numeric (decimal and hex) plus the named entities markdown output can carry.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&amp;/gi, "&");
}

/**
 * True only if `html` is within the allowlisted shape described above.
 *
 * Rejects, among other things: any tag outside `ALLOWED_TAGS`; any attribute
 * outside `ALLOWED_ATTRIBUTES` (which covers every `on*` handler and `style`);
 * any `href`/`src` whose scheme is not http, https or mailto; and any
 * `<!...` / `<?...` construct (comments, doctypes, CDATA, processing
 * instructions), which browsers parse in ways this checker does not model.
 */
export function isSafeRenderedHtml(html: unknown): boolean {
  if (typeof html !== "string") return false;
  if (html.includes("<!") || html.includes("<?")) return false;

  let cursor = 0;
  while (cursor < html.length) {
    const lt = html.indexOf("<", cursor);
    if (lt === -1) break;

    // `</` not followed immediately by a letter is a bogus comment: the browser
    // swallows everything up to the next `>`, ignoring quotes, which is a
    // different shape from the one scanned below. Same reasoning as `<!`/`<?` —
    // refuse what this checker does not model.
    if (html.startsWith("</", lt) && !/^<\/[a-zA-Z]/.test(html.slice(lt))) {
      return false;
    }

    const tag = scanTag(html, lt);
    if (tag === null) {
      // A bare `<` (as in `a < b`) is literal text: step over it and carry on.
      if (html.startsWith("</", lt)) return false;
      if (!/^<\s*[a-zA-Z]/.test(html.slice(lt))) {
        cursor = lt + 1;
        continue;
      }
      // It looked like a tag but never terminated, or a quote was left open.
      return false;
    }

    if (!ALLOWED_TAGS.has(tag.name)) return false;

    ATTR_RE.lastIndex = 0;
    let attr: RegExpExecArray | null;
    while ((attr = ATTR_RE.exec(tag.attrRegion)) !== null) {
      const attrName = attr[1].toLowerCase();
      if (!ALLOWED_ATTRIBUTES.has(attrName)) return false;

      if (attrName === "href" || attrName === "src") {
        if (!isSafeUrl(decodeEntities(unquote(attr[2])))) return false;
      }
    }

    cursor = tag.end + 1;
  }

  return true;
}

/** Escape a string for insertion into HTML text or a quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
