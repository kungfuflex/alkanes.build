import { describe, it, expect } from "vitest";
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_TAGS,
  escapeHtml,
  isSafeRenderedHtml,
  isSafeUrl,
} from "@/lib/safe-html";

describe("isSafeUrl", () => {
  it("accepts the allowed schemes", () => {
    for (const url of [
      "https://alkanes.build",
      "http://example.com/x?y=1",
      "HTTPS://ALKANES.BUILD",
      "mailto:someone@example.com",
    ]) {
      expect(isSafeUrl(url)).toBe(true);
    }
  });

  it("accepts relative references", () => {
    for (const url of ["/docs", "#anchor", "?page=2", "img/x.png", ""]) {
      expect(isSafeUrl(url)).toBe(true);
    }
  });

  it("rejects script-bearing and unexpected schemes", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "blob:https://x/y",
    ]) {
      expect(isSafeUrl(url)).toBe(false);
    }
  });

  it("rejects schemes smuggled past a naive check with whitespace or NULs", () => {
    for (const url of [
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "java\u0000script:alert(1)",
      "  javascript:alert(1)",
      "\u0001javascript:alert(1)",
    ]) {
      expect(isSafeUrl(url)).toBe(false);
    }
  });
});

describe("isSafeRenderedHtml", () => {
  it("accepts the markup renderMarkdown produces", () => {
    for (const html of [
      "",
      "<p>plain</p>",
      "<h2>Heading</h2>\n<p>Body with <strong>bold</strong> and <em>italics</em>.</p>",
      '<pre><code class="language-rust">fn main() {}\n</code></pre>',
      "<ul>\n<li>one</li>\n<li>two</li>\n</ul>",
      "<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>",
      '<a href="https://alkanes.build" rel="nofollow noopener noreferrer" target="_blank">docs</a>',
      '<a href="/docs/quickstart">quickstart</a>',
      '<img src="https://example.com/x.png" alt="x">',
      "<p>a &lt; b and 3 &gt; 2</p>",
      "<hr>",
      "<br>",
    ]) {
      expect(isSafeRenderedHtml(html), html).toBe(true);
    }
  });

  it("rejects tags outside the allowlist", () => {
    for (const html of [
      "<script>alert(1)</script>",
      "<p>ok</p><iframe src='x'></iframe>",
      "<style>body{}</style>",
      "<object data='x'></object>",
      "<embed src='x'>",
      "<link rel='stylesheet' href='x'>",
      "<meta http-equiv='refresh' content='0'>",
      "<base href='//evil'>",
      "<form><input></form>",
      "<svg><animate onbegin='alert(1)'></animate></svg>",
      "<math><mtext></mtext></math>",
      "<body>",
      "<textarea>",
    ]) {
      expect(isSafeRenderedHtml(html), html).toBe(false);
    }
  });

  it("rejects event handlers on otherwise allowed tags", () => {
    for (const html of [
      '<p onclick="alert(1)">x</p>',
      "<img src='x' onerror=alert(1)>",
      '<a href="/x" onmouseover="alert(1)">y</a>',
      '<div ONLOAD="alert(1)">z</div>',
    ]) {
      expect(isSafeRenderedHtml(html), html).toBe(false);
    }
  });

  it("rejects style attributes", () => {
    expect(isSafeRenderedHtml('<p style="x">y</p>')).toBe(false);
  });

  it("rejects unsafe href and src values", () => {
    for (const html of [
      '<a href="javascript:alert(1)">x</a>',
      "<a href='vbscript:x'>y</a>",
      '<img src="data:text/html,<script>alert(1)</script>">',
      '<a href="&#106;avascript:alert(1)">entity decimal</a>',
      '<a href="&#x6a;avascript:alert(1)">entity hex</a>',
      '<a href="java&Tab;script:alert(1)">entity tab</a>',
    ]) {
      expect(isSafeRenderedHtml(html), html).toBe(false);
    }
  });

  it("rejects comments, doctypes, CDATA and processing instructions", () => {
    for (const html of [
      "<!-- comment -->",
      "<!--[if IE]><script>alert(1)</script><![endif]-->",
      "<!DOCTYPE html>",
      "<![CDATA[x]]>",
      "<?php echo 1; ?>",
    ]) {
      expect(isSafeRenderedHtml(html), html).toBe(false);
    }
  });

  it("rejects an unterminated tag rather than guessing", () => {
    expect(isSafeRenderedHtml('<p class="x')).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isSafeRenderedHtml(undefined)).toBe(false);
    expect(isSafeRenderedHtml(null)).toBe(false);
    expect(isSafeRenderedHtml(123)).toBe(false);
    expect(isSafeRenderedHtml({})).toBe(false);
  });

  it("holds no dangerous tag or attribute in its allowlists", () => {
    for (const tag of ["script", "iframe", "object", "embed", "style", "base", "form", "input", "link", "meta", "svg", "math", "template", "noscript"]) {
      expect(ALLOWED_TAGS.has(tag), tag).toBe(false);
    }
    for (const attr of ["style", "onclick", "onerror", "onload", "srcdoc", "formaction", "xlink:href", "srcset", "background", "poster", "data"]) {
      expect(ALLOWED_ATTRIBUTES.has(attr), attr).toBe(false);
    }
  });
});

describe("escapeHtml", () => {
  it("escapes every character that can break out of text or an attribute", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("escapes ampersands before anything else, so escapes are not double-read", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});
